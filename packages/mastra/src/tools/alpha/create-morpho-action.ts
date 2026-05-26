import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { PlasmaVault, Morpho } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { buildTransactionProposal, transactionProposalOutputSchema } from './build-transaction-proposal';
import { formatTokenAmount } from './format-amount';
import { existingActionSchema } from '../wgenie-cfo/types';

export const createMorphoActionTool = createTool({
  id: 'create-morpho-action',
  description: `Create a Morpho fuse action (supply, withdraw, borrow, or repay).
Returns a unified transaction proposal with simulation of ALL pending actions (existing + new).
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']).describe('Action to perform'),
    morphoMarketId: z.string().describe('Morpho Blue market ID (bytes32 hex string starting with 0x)'),
    amount: z.string().describe('Amount in the token smallest unit'),
    tokenSymbol: z.string().optional().describe('Token symbol (e.g., "USDC") for human-readable description'),
    tokenDecimals: z.number().optional().describe('Token decimals for formatting'),
    callerAddress: z.string().optional().describe('Caller address with ALPHA_ROLE for auto-simulation'),
    existingPendingActions: z.array(existingActionSchema).optional().describe('Existing pending actions from working memory'),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, actionType, morphoMarketId, amount, tokenSymbol, tokenDecimals, callerAddress, existingPendingActions, isReady }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const morpho = new Morpho(plasmaVault);
      const amountBigInt = BigInt(amount);

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = morpho.supply(morphoMarketId as Hex, amountBigInt);
          break;
        case 'withdraw':
          fuseActions = morpho.withdraw(morphoMarketId as Hex, amountBigInt);
          break;
        case 'borrow':
          fuseActions = morpho.borrow(morphoMarketId as Hex, amountBigInt);
          break;
        case 'repay':
          fuseActions = morpho.repay(morphoMarketId as Hex, amountBigInt);
          break;
      }

      const newFuseActions = fuseActions.map(a => ({ fuse: a.fuse, data: a.data }));

      // Build human-readable description
      let description: string;
      if (tokenSymbol && tokenDecimals !== undefined) {
        const formatted = formatTokenAmount(amount, tokenDecimals);
        description = `Morpho ${actionType} ${formatted} ${tokenSymbol} in market ${morphoMarketId.slice(0, 10)}...`;
      } else {
        description = `Morpho ${actionType} ${amount} in market ${morphoMarketId.slice(0, 10)}...`;
      }

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'morpho',
          actionType,
          description,
          fuseActions: newFuseActions,
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady,
      });
    } catch (error) {
      return buildTransactionProposal({
        newAction: {
          success: false,
          protocol: 'morpho',
          actionType,
          description: `Failed: Morpho ${actionType}`,
          fuseActions: [],
          error: error instanceof Error ? error.message : String(error),
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady: false,
      });
    }
  },
});
