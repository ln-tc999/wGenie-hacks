import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { buildTransactionProposal, transactionProposalOutputSchema } from '../alpha/build-transaction-proposal';
import { existingActionSchema } from './types';

export const createMerchantMoeSwapActionTool = createTool({
  id: 'create-swap-action',
  description: `Create a fuse action to swap tokens via an aggregator.
Use this when the user wants to swap assets.
The swap executes through the vault's SwapExecutor.
Returns a unified transaction proposal with simulation.
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    tokenIn: z.string().describe('Address of token to sell'),
    tokenOut: z.string().describe('Address of token to buy'),
    amountIn: z.string().describe('Amount to swap in smallest unit'),
    executorAddress: z.string().describe('SwapExecutor contract address'),
    tokenInSymbol: z.string().optional().describe('Symbol of token to sell (e.g., "USDC") for human-readable description'),
    tokenInDecimals: z.number().optional().describe('Decimals of token to sell for formatting'),
    tokenOutSymbol: z.string().optional().describe('Symbol of token to buy (e.g., "WETH")'),
    callerAddress: z.string().optional(),
    existingPendingActions: z.array(existingActionSchema).optional(),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async (_args) => {
    throw new Error('not implemented');
  },
});
