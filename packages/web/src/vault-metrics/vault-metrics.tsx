'use client';

import {
  VaultMetricsContext,
  useVaultMetricsContext,
} from './vault-metrics.context';
import { VaultMetricsDisplay } from './components/vault-metrics-display';
import { VaultMetricsError } from './components/vault-metrics-error';
import { VaultMetricsSkeleton } from './components/vault-metrics-skeleton';
import { useVaultMetricsParams } from '@/vault-metrics/vault-metrics.params';

export const VaultMetrics = () => {
  const params = useVaultMetricsParams();

  return (
    <VaultMetricsContext.Provider
      value={{
        params,
      }}
    >
      <VaultMetricsContent />
    </VaultMetricsContext.Provider>
  );
};

export const VaultMetricsContent = () => {
  const {
    params: { isLoading, isError },
  } = useVaultMetricsContext();

  if (isLoading) {
    return <VaultMetricsSkeleton />;
  }

  if (isError) {
    return <VaultMetricsError />;
  }

  return <VaultMetricsDisplay />;
};
