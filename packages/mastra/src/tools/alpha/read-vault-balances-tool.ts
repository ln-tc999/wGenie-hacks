import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readVaultBalances } from './read-vault-balances';

export const readVaultBalancesTool = createTool({
  id: 'read-vault-balances',
  description: `Read the vault's unallocated ERC20 tokens and allocated DeFi market positions.
Returns token names, symbols, balances, USD prices, and per-market supply/borrow positions.
Use this to check what tokens are available before creating actions.
This tool returns raw data for your reasoning — it does NOT render UI.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
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
      const snapshot = await readVaultBalances(publicClient, vaultAddress as Address);
      return {
        type: 'balance-check' as const,
        success: true,
        ...snapshot,
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
