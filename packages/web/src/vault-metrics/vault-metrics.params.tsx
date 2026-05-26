import { useReadContract } from 'wagmi';
import { erc4626Abi } from 'viem';
import { useVaultMetricsQuery } from '@/vault-metrics/queries/use-vault-metrics-query';
import { useVaultContext } from '@/vault/vault.context';

export const useVaultMetricsParams = () => {
  const { chainId, vaultAddress } = useVaultContext();
  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = useVaultMetricsQuery();

  const metrics = metricsData?.metrics;
  const totalShareBalance = metrics?.totalShareBalance;

  const { data: tvl, isLoading: isTvlLoading } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [totalShareBalance!],
    query: {
      enabled: totalShareBalance !== undefined,
    },
  });

  const isLoading = isMetricsLoading || isTvlLoading;
  const isError = isMetricsError;

  return {
    metrics,
    tvl,
    isLoading,
    isError,
  };
};

export type VaultMetricsParams = ReturnType<typeof useVaultMetricsParams>;
