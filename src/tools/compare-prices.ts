import { VintedAPIClient } from 'vinted-core';

export const comparePricesTool = {
  name: 'compare_prices',
  description: 'Compare prices for a search query across multiple Vinted countries. Great for finding arbitrage opportunities.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search keywords to compare' },
      countries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Country codes to compare (default: fr, de, it, es, nl, pl)',
        default: ['fr', 'de', 'it', 'es', 'nl', 'pl'],
      },
      limit: { type: 'integer', description: 'Items per country to analyze', default: 20 },
    },
    required: ['query'],
  },
};

export async function handleComparePrices(client: VintedAPIClient, args: any): Promise<string> {
  const countries = args.countries || ['fr', 'de', 'it', 'es', 'nl', 'pl'];
  const comparison = await client.comparePrices(args.query, countries, args.limit || 20);

  const result = {
    query: comparison.query,
    summary: {
      bestBuyCountry: comparison.bestBuyCountry,
      bestSellCountry: comparison.bestSellCountry,
      arbitrageSpread: `${comparison.arbitrageSpreadPct}%`,
    },
    countries: comparison.comparisons.map(c => ({
      country: c.country,
      avgPrice: `${c.avgPrice} ${c.currency}`,
      medianPrice: `${c.medianPrice} ${c.currency}`,
      priceRange: `${c.minPrice} - ${c.maxPrice} ${c.currency}`,
      itemCount: c.itemCount,
    })),
  };

  return JSON.stringify({
    ...result,
    _tip: 'For automated cross-country monitoring and bulk analysis, use the cloud version: https://apify.com/kazkn/vinted-smart-scraper',
  }, null, 2);
}
