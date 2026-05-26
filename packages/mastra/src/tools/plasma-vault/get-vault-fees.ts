import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { getPublicClient, CHAIN_NAMES } from './utils/viem-clients';
import { getVaultByAddress } from './utils/vaults-registry';
import type { Address } from 'viem';
import { formatUnits } from 'viem';

// Fee values are typically in basis points or percentage * 1e18
const FEE_DECIMALS = 18;

export const getVaultFeesTool = createTool({
  id: 'get-vault-fees',
  description: `Get fee information for a Plasma Vault.
Returns performance fees, management fees, and wGenie DAO fees.
Fee values are in 18 decimals precision (divide by 1e18 to get percentage as decimal).`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('The Plasma Vault contract address'),
    chainId: z.number().describe('The chain ID where the vault is deployed'),
  }),
  outputSchema: z.object({
    vaultName: z.string().optional(),
    chainName: z.string(),
    performanceFee: z.object({
      totalFee: z.string(),
      totalFeePercent: z.string(),
      recipients: z.array(
        z.object({
          address: z.string(),
          fee: z.string(),
          feePercent: z.string(),
        }),
      ),
    }),
    managementFee: z.object({
      totalFee: z.string(),
      totalFeePercent: z.string(),
      recipients: z.array(
        z.object({
          address: z.string(),
          fee: z.string(),
          feePercent: z.string(),
        }),
      ),
    }),
    wGenieDaoFees: z.object({
      performanceFee: z.string(),
      performanceFeePercent: z.string(),
      managementFee: z.string(),
      managementFeePercent: z.string(),
    }),
  }),
  execute: async ({ vaultAddress, chainId }) => {

    const publicClient = getPublicClient(chainId);
    const vaultEntry = getVaultByAddress(vaultAddress, chainId);

    const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);

    // Fetch all fee data in parallel
    const [
      totalPerformanceFee,
      totalManagementFee,
      performanceFeeRecipients,
      managementFeeRecipients,
      wGenieDaoPerformanceFee,
      wGenieDaoManagementFee,
    ] = await Promise.all([
      vault.getTotalPerformanceFee(),
      vault.getTotalManagementFee(),
      vault.getPerformanceFeeRecipients(),
      vault.getManagementFeeRecipients(),
      vault.getwGenieDaoPerformanceFee(),
      vault.getwGenieDaoManagementFee(),
    ]);

    const formatFeePercent = (fee: bigint): string => {
      const percent = Number(formatUnits(fee, FEE_DECIMALS)) * 100;
      return `${percent.toFixed(2)}%`;
    };

    return {
      vaultName: vaultEntry?.name,
      chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      performanceFee: {
        totalFee: totalPerformanceFee.toString(),
        totalFeePercent: formatFeePercent(totalPerformanceFee),
        recipients: performanceFeeRecipients.map((r) => ({
          address: r.recipient,
          fee: r.feeValue.toString(),
          feePercent: formatFeePercent(r.feeValue),
        })),
      },
      managementFee: {
        totalFee: totalManagementFee.toString(),
        totalFeePercent: formatFeePercent(totalManagementFee),
        recipients: managementFeeRecipients.map((r) => ({
          address: r.recipient,
          fee: r.feeValue.toString(),
          feePercent: formatFeePercent(r.feeValue),
        })),
      },
      wGenieDaoFees: {
        performanceFee: wGenieDaoPerformanceFee.toString(),
        performanceFeePercent: formatFeePercent(wGenieDaoPerformanceFee),
        managementFee: wGenieDaoManagementFee.toString(),
        managementFeePercent: formatFeePercent(wGenieDaoManagementFee),
      },
    };
  },
});
