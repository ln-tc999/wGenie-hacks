import { createContext, useContext } from 'react';
import { type VaultMetricsParams } from './vault-metrics.params';

interface ContextValue {
  params: VaultMetricsParams;
}

export const VaultMetricsContext = createContext<ContextValue | null>(null);

export const useVaultMetricsContext = () => {
  const context = useContext(VaultMetricsContext);

  if (!context) {
    throw new Error(
      'useVaultMetricsContext must be used within VaultMetricsContext.Provider',
    );
  }

  return context;
};
