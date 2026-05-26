import { useDepositorsQuery } from '@/depositors-list/queries/use-depositors-query';
import { useVaultMetricsQuery } from '@/vault-metrics/queries/use-vault-metrics-query';

const ITEMS_PER_PAGE = 20;

export const useDepositorsChartParams = () => {
  // Fetch first page of depositors
  const {
    data: depositorsData,
    isLoading: isDepositorsLoading,
    isError: isDepositorsError,
  } = useDepositorsQuery({
    params: {
      page: 1,
      limit: ITEMS_PER_PAGE,
    },
  });

  // Fetch vault metrics
  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = useVaultMetricsQuery();

  const isLoading = isDepositorsLoading || isMetricsLoading;
  const isError = isDepositorsError || isMetricsError;

  return {
    depositorsData,
    metricsData,
    isLoading,
    isError,
  };
};

export type DepositorsChartParams = ReturnType<typeof useDepositorsChartParams>;
