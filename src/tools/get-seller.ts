import { VintedAPIClient } from 'vinted-core';

export const getSellerTool = {
  name: 'get_seller',
  description: 'Get seller profile, stats, reviews, and recent items from Vinted.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sellerId: { type: 'integer', description: 'Vinted seller/user ID' },
      url: { type: 'string', description: 'Vinted seller profile URL (alternative to sellerId)' },
      country: { type: 'string', description: 'Country code', default: 'fr' },
      includeItems: { type: 'boolean', description: 'Include seller items listing', default: true },
      itemLimit: { type: 'integer', description: 'Max items to include', default: 20 },
    },
  },
};

function parseSellerUrl(url: string): { id?: number; username?: string; country: string } | null {
  // Match both numeric IDs and usernames: /member/12345 or /member/some-username
  const match = url.match(/vinted\.(\w+(?:\.\w+)?)\/member\/([^\/?#]+)/);
  if (!match) return null;
  const domainMap: Record<string, string> = {
    'fr': 'fr', 'de': 'de', 'co.uk': 'uk', 'it': 'it', 'es': 'es',
    'nl': 'nl', 'pl': 'pl', 'pt': 'pt', 'be': 'be', 'at': 'at',
    'lt': 'lt', 'cz': 'cz', 'sk': 'sk', 'hu': 'hu', 'ro': 'ro',
    'hr': 'hr', 'fi': 'fi', 'dk': 'dk', 'se': 'se',
  };
  const identifier = match[2];
  const isNumeric = /^\d+$/.test(identifier);
  return {
    id: isNumeric ? parseInt(identifier, 10) : undefined,
    username: isNumeric ? undefined : identifier,
    country: domainMap[match[1]] || 'fr',
  };
}

export async function handleGetSeller(client: VintedAPIClient, args: any): Promise<string> {
  let sellerId: number;
  let country: string;

  if (args.url) {
    const parsed = parseSellerUrl(args.url);
    if (!parsed) throw new Error(`Invalid Vinted seller URL: ${args.url}`);
    country = parsed.country;
    if (parsed.id) {
      sellerId = parsed.id;
    } else if (parsed.username) {
      const resolvedId = await client.resolveUsername(parsed.username, country);
      if (!resolvedId) throw new Error(`Could not resolve Vinted username: ${parsed.username}`);
      sellerId = resolvedId;
    } else {
      throw new Error(`Could not extract seller ID from URL: ${args.url}`);
    }
  } else if (args.sellerId) {
    sellerId = args.sellerId;
    country = args.country || 'fr';
  } else {
    throw new Error('Either sellerId or url must be provided');
  }

  const seller = await client.getSeller(sellerId, country);

  const result: any = {
    id: seller.id,
    username: seller.username,
    profileUrl: seller.profileUrl,
    rating: seller.rating,
    ratingCount: seller.ratingCount,
    itemCount: seller.itemCount,
    soldItemCount: seller.soldItemCount,
    followerCount: seller.followerCount,
    followingCount: seller.followingCount,
    country: seller.country,
    city: seller.city,
    memberSince: seller.createdAt,
    verifications: seller.verifications,
  };

  if (args.includeItems !== false) {
    result.recentItems = seller.items.slice(0, args.itemLimit || 20).map(item => ({
      id: item.id,
      title: item.title,
      price: `${item.price} ${item.currency}`,
      brand: item.brand,
      url: item.url,
    }));
  }

  return JSON.stringify(result, null, 2);
}
