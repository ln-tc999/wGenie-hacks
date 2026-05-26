import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { PlasmaVault, EulerV2 } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { buildTransactionProposal, transactionProposalOutputSchema } from './build-transaction-proposal';
import { formatTokenAmount } from './format-amount';
import { existingActionSchema } from '../yo-treasury/types';

export const createEulerV2ActionTool = createTool({
  id: 'create-euler-v2-action',
  description: `Create an Euler V2 fuse action (supply or withdraw).
Returns a unified transaction proposal with simulation of ALL pending actions (existing + new).
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw']).describe('Action to perform'),
    eulerVault: z.string().describe('Euler V2 vault address to supply to / withdraw from'),
    amount: z.string().describe('Amount in the token smallest unit'),
    subAccount: z.string().optional().describe('Euler sub-account byte (default 0x00)'),
    tokenSymbol: z.string().optional().describe('Token symbol (e.g., "USDC") for human-readable description'),
    tokenDecimals: z.number().optional().describe('Token decimals for formatting'),
    callerAddress: z.string().optional().describe('Caller address with ALPHA_ROLE for auto-simulation'),
    existingPendingActions: z.array(existingActionSchema).optional().describe('Existing pending actions from working memory'),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, actionType, eulerVault, amount, subAccount, tokenSymbol, tokenDecimals, callerAddress, existingPendingActions, isReady }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const euler = new EulerV2(plasmaVault);
      const amountBigInt = BigInt(amount);
      const sub = (subAccount ?? '0x00') as Hex;

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = euler.supply(eulerVault as Address, amountBigInt, sub);
          break;
        case 'withdraw':
          fuseActions = euler.withdraw(eulerVault as Address, amountBigInt, sub);
          break;
      }

      const newFuseActions = fuseActions.map(a => ({ fuse: a.fuse, data: a.data }));

      // Build human-readable description
      let description: string;
      if (tokenSymbol && tokenDecimals !== undefined) {
        const formatted = formatTokenAmount(amount, tokenDecimals);
        description = `Euler V2 ${actionType} ${formatted} ${tokenSymbol} in vault ${eulerVault.slice(0, 10)}...`;
      } else {
        description = `Euler V2 ${actionType} ${amount} in vault ${eulerVault.slice(0, 10)}...`;
      }

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'euler-v2',
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
          protocol: 'euler-v2',
          actionType,
          description: `Failed: Euler V2 ${actionType}`,
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
