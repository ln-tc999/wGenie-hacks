import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, encodeFunctionData } from 'viem';
import {
  erc4626SupplyFuseAbi,
  YO_VAULT_SLOTS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
} from '@wgenie/fusion-sdk';
import { buildTransactionProposal, transactionProposalOutputSchema } from '../alpha/build-transaction-proposal';
import { formatTokenAmount } from '../alpha/format-amount';
import { existingActionSchema } from './types';
import { YO_UNDERLYING, getYoUnderlyingAddresses } from './vault-metadata';

const SUPPLY_FUSE_BY_SLOT: Record<number, Record<number, Address | undefined>> = {
  1: ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  2: ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  3: ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  4: ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
};

export const createMantleAllocationActionTool = createTool({
  id: 'create-allocation-action',
  description: `Create a fuse action to allocate tokens from the treasury to a Mantle vault (USDY, mETH, cmBTC, MNT).
Uses Erc4626SupplyFuse.enter() to deposit the underlying asset into the Mantle vault.
The treasury must hold the correct underlying token (e.g., USDC for USDY, WETH for mETH).
Returns a unified transaction proposal with simulation.
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    mantleVaultId: z.enum(['USDY', 'mETH', 'cmBTC', 'MNT', 'yoGOLD', 'USDYT']).describe('Which Mantle vault to allocate to'),
    mantleVaultAddress: z.string().describe('Mantle vault contract address'),
    amount: z.string().describe('Amount in underlying token smallest unit (e.g., "50000000" for 50 USDC)'),
    callerAddress: z.string().optional().describe('Caller with ALPHA_ROLE for simulation'),
    existingPendingActions: z.array(existingActionSchema).optional(),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, mantleVaultId, mantleVaultAddress, amount, callerAddress, existingPendingActions, isReady }) => {
    try {
      const slot = YO_VAULT_SLOTS[mantleVaultId as keyof typeof YO_VAULT_SLOTS];
      if (!slot) throw new Error(`Unknown Mantle vault: ${mantleVaultId}`);

      const supplyFuseAddresses = SUPPLY_FUSE_BY_SLOT[slot.slot];
      if (!supplyFuseAddresses) throw new Error(`No supply fuse for slot ${slot.slot}`);
      const fuseAddress = supplyFuseAddresses[chainId];
      if (!fuseAddress) throw new Error(`Supply fuse not configured for chain ${chainId}`);

      const data = encodeFunctionData({
        abi: erc4626SupplyFuseAbi,
        functionName: 'enter',
        args: [{ vault: mantleVaultAddress as Address, vaultAssetAmount: BigInt(amount) }],
      });

      const newFuseActions = [{ fuse: fuseAddress, data }];
      const meta = YO_UNDERLYING[mantleVaultId] ?? { decimals: 0, symbol: mantleVaultId };
      const formatted = formatTokenAmount(amount, meta.decimals);
      const description = `Allocate ${formatted} ${meta.symbol} to ${mantleVaultId}`;

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'wgenie-erc4626',
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
          protocol: 'wgenie-erc4626',
          actionType: 'supply',
          description: `Failed: allocate to ${mantleVaultId}`,
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
