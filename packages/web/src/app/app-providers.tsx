'use client';

import { QueryClientProviderWrapper } from './query-client-provider';
import { WagmiProviderWrapper } from './wagmi-provider';

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProviderWrapper>
      <WagmiProviderWrapper>{children}</WagmiProviderWrapper>
    </QueryClientProviderWrapper>
  );
};
