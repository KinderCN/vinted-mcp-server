import { VintedAPIClient } from 'vinted-core';

const COUNTRY_DOMAINS: Record<string, string> = {
  'fr': 'www.vinted.fr', 'de': 'www.vinted.de', 'uk': 'www.vinted.co.uk',
  'it': 'www.vinted.it', 'es': 'www.vinted.es', 'nl': 'www.vinted.nl',
  'pl': 'www.vinted.pl', 'pt': 'www.vinted.pt', 'be': 'www.vinted.be',
  'at': 'www.vinted.at', 'lt': 'www.vinted.lt', 'cz': 'www.vinted.cz',
};

export const getItemTool = {
  name: 'get_item',
  description: 'Get full details of a Vinted item by ID or URL. Returns price, description, photos, seller info.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      itemId: { type: 'integer', description: 'Vinted item ID' },
      url: { type: 'string', description: 'Vinted item URL (alternative to itemId)' },
      country: { type: 'string', description: 'Country code', default: 'fr' },
    },
  },
};

function parseItemUrl(url: string): { id: number; country: string } | null {
  const match = url.match(/vinted\.(\w+(?:\.\w+)?)\/.*?(\d+)/);
  if (!match) return null;
  const domainMap: Record<string, string> = {
    'fr': 'fr', 'de': 'de', 'co.uk': 'uk', 'it': 'it', 'es': 'es',
    'nl': 'nl', 'pl': 'pl', 'pt': 'pt', 'be': 'be', 'at': 'at',
    'lt': 'lt', 'cz': 'cz', 'sk': 'sk', 'hu': 'hu', 'ro': 'ro',
    'hr': 'hr', 'fi': 'fi', 'dk': 'dk', 'se': 'se',
  };
  return { id: parseInt(match[2], 10), country: domainMap[match[1]] || 'fr' };
}

async function getRedirectSlug(itemUrl: string, proxyUrl?: string): Promise<string> {
  // Strategy: Use HTTP CONNECT via proxy to get redirect Location header
  // Vinted returns 307 redirect with slug BEFORE Cloudflare challenge
  if (proxyUrl) {
    const http = await import('http');
    const proxyParsed = new URL(proxyUrl);
    const targetParsed = new URL(itemUrl);
    
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new Error('proxy timeout')); }, 15000);
      
      const proxyReq = http.request({
        hostname: proxyParsed.hostname,
        port: parseInt(proxyParsed.port) || 8000,
        method: 'CONNECT',
        path: `${targetParsed.hostname}:443`,
        headers: proxyParsed.username ? {
          'Proxy-Authorization': 'Basic ' + Buffer.from(`${decodeURIComponent(proxyParsed.username)}:${decodeURIComponent(proxyParsed.password)}`).toString('base64'),
        } : {},
      });

      proxyReq.on('connect', (_res, socket) => {
        const tls = require('tls');
        const tlsSocket = tls.connect({
          host: targetParsed.hostname,
          socket: socket,
          servername: targetParsed.hostname,
        }, () => {
          const reqLine = `GET ${targetParsed.pathname} HTTP/1.1\r\nHost: ${targetParsed.hostname}\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\r\nConnection: close\r\n\r\n`;
          tlsSocket.write(reqLine);
        });

        let data = '';
        tlsSocket.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        tlsSocket.on('end', () => {
          clearTimeout(timeout);
          const locMatch = data.match(/[Ll]ocation:\s*(.*?)[\r\n]/);
          resolve(locMatch ? locMatch[1].trim() : '');
          socket.destroy();
        });
        tlsSocket.on('error', (e: Error) => { clearTimeout(timeout); reject(e); });
      });

      proxyReq.on('error', (e) => { clearTimeout(timeout); reject(e); });
      proxyReq.end();
    });
  }

  // Direct fetch (no proxy)
  const resp = await fetch(itemUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  return resp.headers.get('location') || '';
}

export async function handleGetItem(client: VintedAPIClient, args: any): Promise<string> {
  let itemId: number;
  let country: string;

  if (args.url) {
    const parsed = parseItemUrl(args.url);
    if (!parsed) throw new Error(`Invalid Vinted item URL: ${args.url}`);
    itemId = parsed.id;
    country = parsed.country;
  } else if (args.itemId) {
    itemId = args.itemId;
    country = args.country || 'fr';
  } else {
    throw new Error('Either itemId or url must be provided');
  }

  const domain = COUNTRY_DOMAINS[country] || 'www.vinted.fr';
  const itemUrl = `https://${domain}/items/${itemId}`;
  const proxyUrl = process.env.APIFY_PROXY_URL || (client as any).proxyUrl;

  // Step 1: Get slug from redirect
  let keywords = '';
  try {
    const location = await getRedirectSlug(itemUrl, proxyUrl);
    const slugMatch = location.match(/\/items\/\d+-(.*)/);
    if (slugMatch) {
      keywords = slugMatch[1].replace(/-/g, ' ').trim();
    }
    console.log(`[get_item] Item ${itemId}: redirect location="${location}", keywords="${keywords}"`);
  } catch (err: any) {
    console.warn(`[get_item] Redirect failed for ${itemId}: ${err.message}`);
  }

  // Step 2: Search with slug keywords and find exact item
  if (keywords) {
    try {
      const searchResult = await client.searchItems({ country, query: keywords, perPage: 96 });
      const match = searchResult.items.find((i: any) => i.id === itemId || String(i.id) === String(itemId));
      if (match) {
        console.log(`[get_item] Found item ${itemId} via redirect+search`);
        return JSON.stringify({
          id: match.id,
          title: match.title,
          description: match.description || keywords,
          price: `${match.price} ${match.currency || 'EUR'}`,
          brand: match.brand || null,
          size: match.size || null,
          condition: match.condition || null,
          favourites: match.favouriteCount || match.favourites || 0,
          url: match.url || itemUrl,
          photos: match.photos || [],
          seller: match.seller || null,
          _source: 'redirect+search',
        }, null, 2);
      }
      console.warn(`[get_item] Item ${itemId} not in search results for "${keywords}" (${searchResult.items.length} results)`);
    } catch (err: any) {
      console.warn(`[get_item] Search failed for "${keywords}": ${err.message}`);
    }
  }

  // Step 3: Fallback to core getItem
  try {
    const fullItem = await client.getItem(itemId, country);
    if (fullItem && fullItem.title) {
      return JSON.stringify({
        id: fullItem.id, title: fullItem.title, description: fullItem.description,
        price: `${fullItem.price} ${fullItem.currency}`,
        brand: fullItem.brand, size: fullItem.size, condition: fullItem.condition,
        photos: fullItem.photos, favourites: fullItem.favouriteCount,
        url: fullItem.url,
        seller: fullItem.seller ? { username: fullItem.seller.username, rating: fullItem.seller.rating } : null,
        _source: 'core',
      }, null, 2);
    }
  } catch (err: any) {
    console.warn(`[get_item] Core getItem failed: ${err.message}`);
  }

  return JSON.stringify({
    error: `Item ${itemId} not found. It may have been sold or removed.`,
    suggestion: 'Try search_items with keywords instead.',
  }, null, 2);
}
