import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { getPublicClient, CHAIN_NAMES } from './utils/viem-clients';
import { getVaultByAddress } from './utils/vaults-registry';
import type { Address } from 'viem';

export const getVaultInfoTool = createTool({
  id: 'get-vault-info',
  description: `Get basic information about a specific Plasma Vault.
Returns vault address, underlying asset, asset decimals, price oracle address, and chain info.
Use this to understand the vault's basic configuration before querying more specific data.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('The Plasma Vault contract address'),
    chainId: z.number().describe('The chain ID where the vault is deployed'),
  }),
  outputSchema: z.object({
    vaultAddress: z.string(),
    vaultName: z.string().optional(),
    chainId: z.number(),
    chainName: z.string(),
    assetAddress: z.string(),
    assetDecimals: z.number(),
    priceOracleAddress: z.string(),
    appUrl: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {

    const publicClient = getPublicClient(chainId);

    // Get vault info from registry
    const vaultEntry = getVaultByAddress(vaultAddress, chainId);

    // Create PlasmaVault instance to fetch on-chain data
    const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);

    return {
      vaultAddress: vault.address,
      vaultName: vaultEntry?.name,
      chainId: vault.chainId,
      chainName: CHAIN_NAMES[vault.chainId] || `Chain ${vault.chainId}`,
      assetAddress: vault.assetAddress,
      assetDecimals: vault.assetDecimals,
      priceOracleAddress: vault.priceOracle,
      appUrl: vaultEntry?.url,
    };
  },
});
