import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readYoTreasuryBalances } from './read-yo-treasury-balances';
import { mapYoPositionsToMarkets } from './map-yo-to-market-balances';

export const readTreasuryBalancesTool = createTool({
  id: 'read-treasury-balances',
  description: `Read the treasury vault's current token balances and YO vault positions.
Returns unallocated tokens and YO vault share positions with USD values.
Use this to check available balances before creating allocation, withdrawal, or swap actions.
This tool returns raw data for your reasoning — it does NOT render UI.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID'),
  }),
  outputSchema: z.object({
    type: z.literal('balance-check'),
    success: z.boolean(),
    assets: z.array(z.object({
      address: z.string(),
      name: z.string(),
      symbol: z.string(),
      decimals: z.number(),
      balance: z.string(),
      balanceFormatted: z.string(),
      priceUsd: z.string(),
      valueUsd: z.string(),
    })),
    markets: z.array(z.any()),
    totalValueUsd: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readYoTreasuryBalances(publicClient, vaultAddress as Address);
      return {
        type: 'balance-check' as const,
        success: true,
        assets: snapshot.assets,
        markets: mapYoPositionsToMarkets(snapshot.yoPositions),
        totalValueUsd: snapshot.totalValueUsd,
      };
    } catch (error) {
      return {
        type: 'balance-check' as const,
        success: false,
        assets: [],
        markets: [],
        totalValueUsd: '0.00',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
