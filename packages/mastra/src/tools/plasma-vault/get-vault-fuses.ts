import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { getPublicClient, CHAIN_NAMES } from './utils/viem-clients';
import { getVaultByAddress } from './utils/vaults-registry';
import type { Address } from 'viem';

export const getVaultFusesTool = createTool({
  id: 'get-vault-fuses',
  description: `Get all fuses configured on a Plasma Vault.
Fuses are smart contract modules that enable the vault to interact with DeFi protocols.
Can retrieve regular fuses, balance fuses, or rewards fuses.
Also returns the market IDs associated with the fuses.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('The Plasma Vault contract address'),
    chainId: z.number().describe('The chain ID where the vault is deployed'),
    fuseType: z
      .enum(['all', 'fuses', 'balanceFuses', 'rewardsFuses'])
      .optional()
      .default('all')
      .describe('Type of fuses to retrieve'),
  }),
  outputSchema: z.object({
    vaultName: z.string().optional(),
    chainName: z.string(),
    fuses: z.array(z.string()).optional(),
    balanceFuses: z.array(z.string()).optional(),
    rewardsFuses: z.array(z.string()).optional(),
    marketIds: z.array(z.string()),
    instantWithdrawalFuses: z.array(z.string()),
  }),
  execute: async ({ vaultAddress, chainId, fuseType }) => {

    const publicClient = getPublicClient(chainId);
    const vaultEntry = getVaultByAddress(vaultAddress, chainId);

    const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);

    const result: {
      vaultName?: string;
      chainName: string;
      fuses?: string[];
      balanceFuses?: string[];
      rewardsFuses?: string[];
      marketIds: string[];
      instantWithdrawalFuses: string[];
    } = {
      vaultName: vaultEntry?.name,
      chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      marketIds: [],
      instantWithdrawalFuses: [],
    };

    // Get fuses based on type
    if (fuseType === 'all' || fuseType === 'fuses') {
      const fuses = await vault.getFuses();
      result.fuses = [...fuses];
    }

    if (fuseType === 'all' || fuseType === 'balanceFuses') {
      const balanceFuses = await vault.getBalanceFuses();
      result.balanceFuses = [...balanceFuses];
    }

    if (fuseType === 'all' || fuseType === 'rewardsFuses') {
      try {
        const rewardsFuses = await vault.getRewardsFuses();
        result.rewardsFuses = [...rewardsFuses];
      } catch {
        // Some vaults may not have rewards fuses configured
        result.rewardsFuses = [];
      }
    }

    // Get market IDs
    const include: Array<'fuses' | 'balanceFuses' | 'rewardsFuses'> =
      fuseType === 'all'
        ? ['fuses', 'balanceFuses', 'rewardsFuses']
        : [fuseType as 'fuses' | 'balanceFuses' | 'rewardsFuses'];

    const marketIds = await vault.getMarketIds({ include });
    result.marketIds = marketIds.map((id) => id.toString());

    // Get instant withdrawal fuses
    const instantWithdrawalFuses = await vault.getInstantWithdrawalFuses();
    result.instantWithdrawalFuses = instantWithdrawalFuses.map((f) => f[0]); // First element is the fuse address

    return result;
  },
});
