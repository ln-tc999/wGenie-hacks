import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, encodeFunctionData } from 'viem';
import {
  yoErc4626SupplyFuseAbi,
  YO_VAULT_SLOTS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
} from '@wgenie/fusion-sdk';
import { buildTransactionProposal, transactionProposalOutputSchema } from '../alpha/build-transaction-proposal';
import { formatTokenAmount } from '../alpha/format-amount';
import { existingActionSchema } from './types';
import { YO_UNDERLYING, getYoUnderlyingAddresses } from './yo-vault-metadata';

const SUPPLY_FUSE_BY_SLOT: Record<number, Record<number, Address | undefined>> = {
  1: ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  2: ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  3: ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  4: ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
};

export const createYoAllocationActionTool = createTool({
  id: 'create-yo-allocation-action',
  description: `Create a fuse action to allocate tokens from the treasury to a YO vault (yoUSD, yoETH, yoBTC, yoEUR).
Uses Erc4626SupplyFuse.enter() to deposit the underlying asset into the YO vault.
The treasury must hold the correct underlying token (e.g., USDC for yoUSD, WETH for yoETH).
Returns a unified transaction proposal with simulation.
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR', 'yoGOLD', 'yoUSDT']).describe('Which YO vault to allocate to'),
    yoVaultAddress: z.string().describe('YO vault contract address'),
    amount: z.string().describe('Amount in underlying token smallest unit (e.g., "50000000" for 50 USDC)'),
    callerAddress: z.string().optional().describe('Caller with ALPHA_ROLE for simulation'),
    existingPendingActions: z.array(existingActionSchema).optional(),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, yoVaultId, yoVaultAddress, amount, callerAddress, existingPendingActions, isReady }) => {
    try {
      const slot = YO_VAULT_SLOTS[yoVaultId as keyof typeof YO_VAULT_SLOTS];
      if (!slot) throw new Error(`Unknown YO vault: ${yoVaultId}`);

      const supplyFuseAddresses = SUPPLY_FUSE_BY_SLOT[slot.slot];
      if (!supplyFuseAddresses) throw new Error(`No supply fuse for slot ${slot.slot}`);
      const fuseAddress = supplyFuseAddresses[chainId];
      if (!fuseAddress) throw new Error(`Supply fuse not configured for chain ${chainId}`);

      const data = encodeFunctionData({
        abi: yoErc4626SupplyFuseAbi,
        functionName: 'enter',
        args: [{ vault: yoVaultAddress as Address, vaultAssetAmount: BigInt(amount) }],
      });

      const newFuseActions = [{ fuse: fuseAddress, data }];
      const meta = YO_UNDERLYING[yoVaultId] ?? { decimals: 0, symbol: yoVaultId };
      const formatted = formatTokenAmount(amount, meta.decimals);
      const description = `Allocate ${formatted} ${meta.symbol} to ${yoVaultId}`;

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'yo-erc4626',
          actionType: 'supply',
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
          actionType: 'supply',
          description: `Failed: allocate to ${yoVaultId}`,
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
