import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { PlasmaVault, AaveV3 } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { buildTransactionProposal, transactionProposalOutputSchema } from './build-transaction-proposal';
import { formatTokenAmount } from './format-amount';
import { existingActionSchema } from '../wgenie-cfo/types';

export const createAaveV3ActionTool = createTool({
  id: 'create-aave-v3-action',
  description: `Create an Aave V3 fuse action (supply, withdraw, borrow, or repay).
Returns a unified transaction proposal with simulation of ALL pending actions (existing + new).
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']).describe('Action to perform'),
    assetAddress: z.string().describe('ERC20 token address to supply/withdraw/borrow/repay'),
    amount: z.string().describe('Amount in the token smallest unit (e.g. "1000000000" for 1000 USDC with 6 decimals)'),
    tokenSymbol: z.string().optional().describe('Token symbol (e.g., "USDC") for human-readable description'),
    tokenDecimals: z.number().optional().describe('Token decimals for formatting'),
    callerAddress: z.string().optional().describe('Caller address with ALPHA_ROLE for auto-simulation'),
    existingPendingActions: z.array(existingActionSchema).optional().describe('Existing pending actions from working memory'),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, actionType, assetAddress, amount, tokenSymbol, tokenDecimals, callerAddress, existingPendingActions, isReady }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const aaveV3 = new AaveV3(plasmaVault);
      const amountBigInt = BigInt(amount);

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = aaveV3.supply(assetAddress as Address, amountBigInt);
          break;
        case 'withdraw':
          fuseActions = aaveV3.withdraw(assetAddress as Address, amountBigInt);
          break;
        case 'borrow':
          fuseActions = aaveV3.borrow(assetAddress as Address, amountBigInt);
          break;
        case 'repay':
          fuseActions = aaveV3.repay(assetAddress as Address, amountBigInt);
          break;
      }

      const newFuseActions = fuseActions.map(a => ({ fuse: a.fuse, data: a.data }));

      // Build human-readable description
      let description: string;
      if (tokenSymbol && tokenDecimals !== undefined) {
        const formatted = formatTokenAmount(amount, tokenDecimals);
        description = `Aave V3 ${actionType} ${formatted} ${tokenSymbol}`;
      } else {
        description = `Aave V3 ${actionType} ${amount} of asset ${assetAddress.slice(0, 10)}...`;
      }

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'aave-v3',
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
          protocol: 'aave-v3',
          actionType,
          description: `Failed: Aave V3 ${actionType}`,
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
