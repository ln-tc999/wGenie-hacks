import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { getPublicClient, CHAIN_NAMES } from './utils/viem-clients';
import { getVaultByAddress } from './utils/vaults-registry';
import type { Address } from 'viem';
import { formatUnits, erc4626Abi } from 'viem';

// Helper to convert value to 18 decimals
function to18(value: bigint, decimals: number): bigint {
  if (decimals === 18) return value;
  if (decimals < 18) {
    return value * 10n ** BigInt(18 - decimals);
  }
  return value / 10n ** BigInt(decimals - 18);
}

const ONE_ETHER = 10n ** 18n;

export const getVaultTvlTool = createTool({
  id: 'get-vault-tvl',
  description: `Get the Total Value Locked (TVL) for a Plasma Vault.
Returns total assets in the vault (in asset units), TVL in USD, and current asset price.
All USD values are in 18 decimals precision.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('The Plasma Vault contract address'),
    chainId: z.number().describe('The chain ID where the vault is deployed'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    vaultName: z.string().optional(),
    chainName: z.string().optional(),
    totalAssets: z.string().optional().describe('Total assets in vault (raw value)'),
    totalAssetsFormatted: z.string().optional().describe('Total assets formatted with decimals'),
    assetDecimals: z.number().optional(),
    tvlUsd18: z.string().optional().describe('TVL in USD (18 decimals precision)'),
    tvlUsdFormatted: z.string().optional().describe('TVL in USD (human readable)'),
    assetPriceUsd18: z.string().optional().describe('Asset price in USD (18 decimals)'),
    assetPriceUsdFormatted: z.string().optional().describe('Asset price in USD (human readable)'),
    note: z.string().optional().describe('Additional notes about the data'),
    error: z.string().optional().describe('Error message if the operation failed'),
  }),
  execute: async ({ vaultAddress, chainId }) => {

    try {
      const publicClient = getPublicClient(chainId);
      const vaultEntry = getVaultByAddress(vaultAddress, chainId);

      // Create PlasmaVault instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);

      // Try SDK methods first, fall back to direct contract calls
      let totalAssets: bigint;
      let assetPriceUsd18: bigint;
      let note: string | undefined;

      try {
        // Try SDK's getTotalAssets which updates market balances first
        totalAssets = await vault.getTotalAssets();
      } catch (sdkError) {
        // Fallback: read totalAssets directly from ERC-4626 (without market balance update)
        totalAssets = await publicClient.readContract({
          address: vaultAddress as Address,
          abi: erc4626Abi,
          functionName: 'totalAssets',
        });
        note = `TVL calculated using cached balances. SDK error: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`;
      }

      // Get asset price (this should work for all vaults)
      assetPriceUsd18 = await vault.getAssetUsdPrice_18();

      // Calculate TVL in USD
      const totalAssets18 = to18(totalAssets, vault.assetDecimals);
      const tvlUsd18 = (totalAssets18 * assetPriceUsd18) / ONE_ETHER;

      return {
        success: true,
        vaultName: vaultEntry?.name,
        chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        totalAssets: totalAssets.toString(),
        totalAssetsFormatted: formatUnits(totalAssets, vault.assetDecimals),
        assetDecimals: vault.assetDecimals,
        tvlUsd18: tvlUsd18.toString(),
        tvlUsdFormatted: formatUnits(tvlUsd18, 18),
        assetPriceUsd18: assetPriceUsd18.toString(),
        assetPriceUsdFormatted: formatUnits(assetPriceUsd18, 18),
        note,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get TVL: ${errorMessage}`,
        chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      };
    }
  },
});
