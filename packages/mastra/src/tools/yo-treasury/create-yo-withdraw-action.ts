import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, encodeFunctionData, erc20Abi } from 'viem';
import {
  yoRedeemFuseAbi,
  YO_VAULT_SLOTS,
  YO_REDEEM_FUSE_SLOT1_ADDRESS,
  YO_REDEEM_FUSE_SLOT2_ADDRESS,
  YO_REDEEM_FUSE_SLOT3_ADDRESS,
  YO_REDEEM_FUSE_SLOT4_ADDRESS,
} from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { buildTransactionProposal, transactionProposalOutputSchema } from '../alpha/build-transaction-proposal';
import { existingActionSchema } from './types';
import { getYoUnderlyingAddresses } from './yo-vault-metadata';

const REDEEM_FUSE_BY_SLOT: Record<number, Record<number, Address | undefined>> = {
  1: YO_REDEEM_FUSE_SLOT1_ADDRESS,
  2: YO_REDEEM_FUSE_SLOT2_ADDRESS,
  3: YO_REDEEM_FUSE_SLOT3_ADDRESS,
  4: YO_REDEEM_FUSE_SLOT4_ADDRESS,
};

export const createYoWithdrawActionTool = createTool({
  id: 'create-yo-withdraw-action',
  description: `Create a fuse action to withdraw from a YO vault back to the treasury.
Uses YoRedeemFuse.exit() which calls redeem() — NOT withdraw() (withdraw is disabled on YO vaults).
Reads the vault's current YO share balance and redeems all or a specified amount.
Returns a unified transaction proposal with simulation.
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID'),
    yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR', 'yoGOLD', 'yoUSDT']).describe('YO vault to withdraw from'),
    yoVaultAddress: z.string().describe('YO vault contract address'),
    shares: z.string().optional().describe('Share amount to redeem. If omitted, redeems all shares.'),
    callerAddress: z.string().optional(),
    existingPendingActions: z.array(existingActionSchema).optional(),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, yoVaultId, yoVaultAddress, shares, callerAddress, existingPendingActions, isReady }) => {
    try {
      const slot = YO_VAULT_SLOTS[yoVaultId as keyof typeof YO_VAULT_SLOTS];
      if (!slot) throw new Error(`Unknown YO vault: ${yoVaultId}`);

      const redeemFuseAddresses = REDEEM_FUSE_BY_SLOT[slot.slot];
      if (!redeemFuseAddresses) throw new Error(`No redeem fuse for slot ${slot.slot}`);
      const fuseAddress = redeemFuseAddresses[chainId];
      if (!fuseAddress) throw new Error(`Redeem fuse not configured for chain ${chainId}`);

      let sharesToRedeem: bigint;

      if (shares) {
        sharesToRedeem = BigInt(shares);
      } else {
        const publicClient = getPublicClient(chainId);
        const balance = await publicClient.readContract({
          address: yoVaultAddress as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [vaultAddress as Address],
        });
        sharesToRedeem = balance;
      }

      if (sharesToRedeem === 0n) {
        return buildTransactionProposal({
          newAction: {
            success: false,
            protocol: 'yo-erc4626',
            actionType: 'withdraw',
            description: `No ${yoVaultId} shares to withdraw`,
            fuseActions: [],
            error: `Treasury holds 0 ${yoVaultId} shares`,
          },
          existingPendingActions,
          vaultAddress,
          chainId,
          callerAddress,
          isReady: false,
          additionalTokenAddresses: getYoUnderlyingAddresses(chainId),
        });
      }

      const data = encodeFunctionData({
        abi: yoRedeemFuseAbi,
        functionName: 'exit',
        args: [{ vault: yoVaultAddress as Address, shares: sharesToRedeem }],
      });

      const newFuseActions = [{ fuse: fuseAddress, data }];
      const description = shares
        ? `Withdraw ${shares} shares from ${yoVaultId}`
        : `Withdraw all shares from ${yoVaultId}`;

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'yo-erc4626',
          actionType: 'withdraw',
          description,
          fuseActions: newFuseActions,
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady,
        additionalTokenAddresses: getYoUnderlyingAddresses(chainId),
      });
    } catch (error) {
      return buildTransactionProposal({
        newAction: {
          success: false,
          protocol: 'yo-erc4626',
          actionType: 'withdraw',
          description: `Failed: withdraw from ${yoVaultId}`,
          fuseActions: [],
          error: error instanceof Error ? error.message : String(error),
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady: false,
        additionalTokenAddresses: getYoUnderlyingAddresses(chainId),
      });
    }
  },
});
