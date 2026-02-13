import { VintedAPIClient, SearchParams, Condition, SortBy } from 'vinted-core';

export const searchItemsTool = {
  name: 'search_items',
  description: 'Search Vinted items with filters. Returns items with price, photos, seller info. Supports 19 countries.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search keywords' },
      country: { type: 'string', description: 'Country code (fr, de, uk, it, es, nl, pl, pt, be, at, lt, cz, sk, hu, ro, hr, fi, dk, se)', default: 'fr' },
      priceMin: { type: 'number', description: 'Minimum price filter' },
      priceMax: { type: 'number', description: 'Maximum price filter' },
      brandIds: { type: 'array', items: { type: 'integer' }, description: 'Filter by brand IDs' },
      categoryId: { type: 'integer', description: 'Vinted category ID filter' },
      condition: { type: 'array', items: { type: 'string' }, description: 'Condition filter (new_with_tags, new_without_tags, very_good, good, satisfactory)' },
      sortBy: { type: 'string', enum: ['relevance', 'price_low_to_high', 'price_high_to_low', 'newest_first'], description: 'Sort order' },
      limit: { type: 'integer', description: 'Max items to return (max 100)', default: 20 },
    },
    required: ['query'],
  },
};

export async function handleSearchItems(client: VintedAPIClient, args: any): Promise<string> {
  const params: SearchParams = {
    query: args.query,
    country: args.country || 'fr',
    categoryId: args.categoryId,
    brandIds: args.brandIds,
    priceMin: args.priceMin,
    priceMax: args.priceMax,
    condition: args.condition as Condition[],
    sortBy: (args.sortBy || 'relevance') as SortBy,
    perPage: Math.min(args.limit || 20, 100),
    page: 1,
  };

  const result = await client.searchItems(params);

  const summary = result.items.map(item => ({
    id: item.id,
    title: item.title,
    price: `${item.price} ${item.currency}`,
    brand: item.brand,
    condition: item.condition,
    size: item.size,
    favourites: item.favouriteCount,
    url: item.url,
    seller: item.seller.username,
  }));

  return JSON.stringify({
    totalFound: result.totalCount,
    returned: summary.length,
    country: params.country,
    items: summary,
    _tip: summary.length >= 20 ? 'Need more results or batch processing? Try the cloud version: https://apify.com/kazkn/vinted-smart-scraper' : undefined,
  }, null, 2);
}
