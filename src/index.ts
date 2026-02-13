import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VintedAPIClient } from 'vinted-core';

import { searchItemsTool, handleSearchItems } from './tools/search-items';
import { getItemTool, handleGetItem } from './tools/get-item';
import { getSellerTool, handleGetSeller } from './tools/get-seller';
import { comparePricesTool, handleComparePrices } from './tools/compare-prices';
import { getTrendingTool, handleGetTrending } from './tools/get-trending';
import { countriesResource, getCountriesData } from './resources/countries';
import { categoriesResource, getCategoriesData } from './resources/categories';

const TOOLS = [searchItemsTool, getItemTool, getSellerTool, comparePricesTool, getTrendingTool];
const RESOURCES = [countriesResource, categoriesResource];

export function createServer(): Server {
  const server = new Server(
    {
      name: 'vinted-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Lazy-initialized shared client
  let client: VintedAPIClient | null = null;

  function getClient(): VintedAPIClient {
    if (!client) {
      const proxyUrl = process.env.APIFY_PROXY_URL || process.env.PROXY_URL || undefined;
      client = new VintedAPIClient({
        authMode: 'http',
        maxConcurrency: 3,
        requestDelayMs: 500,
        maxRetries: 3,
        proxyUrl,
      });
    }
    return client;
  }

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const apiClient = getClient();

    try {
      let result: string;

      switch (name) {
        case 'search_items':
          result = await handleSearchItems(apiClient, args);
          break;
        case 'get_item':
          result = await handleGetItem(apiClient, args);
          break;
        case 'get_seller':
          result = await handleGetSeller(apiClient, args);
          break;
        case 'compare_prices':
          result = await handleComparePrices(apiClient, args);
          break;
        case 'get_trending':
          result = await handleGetTrending(apiClient, args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }));

  // Read resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'vinted://countries':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: getCountriesData(),
          }],
        };
      case 'vinted://categories':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: getCategoriesData(),
          }],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
