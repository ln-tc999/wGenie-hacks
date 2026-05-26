import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { getPublicClient, CHAIN_NAMES } from './utils/viem-clients';
import { getVaultByAddress } from './utils/vaults-registry';
import type { Address } from 'viem';

/**
 * Available roles in the PlasmaVault access control system
 */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  ALPHA_ROLE: 'Can execute fuse actions on the vault',
  ATOMIST_ROLE: 'Can configure vault parameters, substrates, and fees',
  FUSE_MANAGER_ROLE: 'Can add/remove fuses on the vault',
  PRE_HOOKS_MANAGER_ROLE: 'Can configure pre-hook implementations',
  GUARDIAN_ROLE: 'Can pause vault operations in emergencies',
  CLAIM_REWARDS_ROLE: 'Can claim rewards from integrated protocols',
  TRANSFER_REWARDS_ROLE: 'Can transfer claimed rewards',
  CONFIG_INSTANT_WITHDRAWAL_FUSES_ROLE: 'Can configure instant withdrawal fuses',
};

export const checkRoleTool = createTool({
  id: 'check-role',
  description: `Check if an address has a specific role on a Plasma Vault.
Available roles: ${Object.keys(ROLE_DESCRIPTIONS).join(', ')}.
Returns whether the address is a member and any execution delay configured.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('The Plasma Vault contract address'),
    chainId: z.number().describe('The chain ID where the vault is deployed'),
    accountAddress: z.string().describe('The address to check role for'),
    role: z
      .enum([
        'ALPHA_ROLE',
        'ATOMIST_ROLE',
        'FUSE_MANAGER_ROLE',
        'PRE_HOOKS_MANAGER_ROLE',
        'GUARDIAN_ROLE',
        'CLAIM_REWARDS_ROLE',
        'TRANSFER_REWARDS_ROLE',
        'CONFIG_INSTANT_WITHDRAWAL_FUSES_ROLE',
      ])
      .describe('The role to check'),
  }),
  outputSchema: z.object({
    vaultName: z.string().optional(),
    chainName: z.string(),
    accountAddress: z.string(),
    role: z.string(),
    roleDescription: z.string(),
    isMember: z.boolean(),
    executionDelay: z.number().describe('Execution delay in seconds (0 if no delay)'),
  }),
  execute: async ({ vaultAddress, chainId, accountAddress, role }) => {

    const publicClient = getPublicClient(chainId);
    const vaultEntry = getVaultByAddress(vaultAddress, chainId);

    const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);

    const { isMember, executionDelay } = await vault.hasRole(role, accountAddress as Address);

    return {
      vaultName: vaultEntry?.name,
      chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      accountAddress,
      role,
      roleDescription: ROLE_DESCRIPTIONS[role] || 'Unknown role',
      isMember,
      executionDelay: Number(executionDelay),
    };
  },
});
