import { useState } from 'react';
import type { TimeRange } from '@/flow-chart/flow-chart.types';
import { useFlowChartQuery } from '@/flow-chart/queries/use-flow-chart-query';
import { useVaultContext } from '@/vault/vault.context';

export const useFlowChartParams = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { chainId, vaultAddress } = useVaultContext();

  const { data, isLoading, error } = useFlowChartQuery({
    vaultAddress,
    chainId,
    timeRange,
  });

  return {
    timeRange,
    setTimeRange,
    data,
    isLoading,
    error,
  };
};

export type FlowChartParams = ReturnType<typeof useFlowChartParams>;
