import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  filterVaults,
  getAllTags,
  getVaultChainIds,
  getVaultCountByChain,
} from './utils/vaults-registry';
import { CHAIN_NAMES } from './utils/viem-clients';

export const listVaultsTool = createTool({
  id: 'list-vaults',
  description: `List all available wGenie Fusion Plasma Vaults with optional filtering.
Can filter by chain ID, tags, or search by name.
Returns vault name, address, chain, tags, and app URL.
Use this tool first to discover available vaults before querying specific vault data.`,
  inputSchema: z.object({
    chainId: z
      .number()
      .optional()
      .describe('Filter by chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Filter by tags (e.g., "Lending Optimizer", "Leveraged Looping", "DEX LP")'),
    nameContains: z
      .string()
      .optional()
      .describe('Search vaults by name (case-insensitive partial match)'),
    showStats: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include statistics about available tags and chain distribution'),
  }),
  outputSchema: z.object({
    vaults: z.array(
      z.object({
        name: z.string(),
        address: z.string(),
        chainId: z.number(),
        chainName: z.string(),
        tags: z.array(z.string()),
        url: z.string(),
      }),
    ),
    totalCount: z.number(),
    stats: z
      .object({
        availableTags: z.array(z.string()),
        vaultsByChain: z.record(z.string(), z.number()),
        supportedChainIds: z.array(z.number()),
      })
      .optional(),
  }),
  execute: async ({ chainId, tags, nameContains, showStats }) => {

    const vaults = filterVaults({ chainId, tags, nameContains });

    const formattedVaults = vaults.map((v) => ({
      name: v.name,
      address: v.address,
      chainId: v.chainId,
      chainName: CHAIN_NAMES[v.chainId] || `Chain ${v.chainId}`,
      tags: v.tags,
      url: v.url,
    }));

    const result: {
      vaults: typeof formattedVaults;
      totalCount: number;
      stats?: {
        availableTags: string[];
        vaultsByChain: Record<string, number>;
        supportedChainIds: number[];
      };
    } = {
      vaults: formattedVaults,
      totalCount: formattedVaults.length,
    };

    if (showStats) {
      const countByChain = getVaultCountByChain();
      const vaultsByChain: Record<string, number> = {};
      Object.entries(countByChain).forEach(([id, count]) => {
        const chainName = CHAIN_NAMES[Number(id)] || `Chain ${id}`;
        vaultsByChain[chainName] = count;
      });

      result.stats = {
        availableTags: getAllTags(),
        vaultsByChain,
        supportedChainIds: getVaultChainIds(),
      };
    }

    return result;
  },
});
