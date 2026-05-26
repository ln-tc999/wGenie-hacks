'use client';

import { useEffect } from 'react';
import type { Decorator } from '@storybook/react';
import { type Hex } from 'viem';
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useConnect,
} from 'wagmi';
import { mainnet, arbitrum, base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privateKeyConnector } from './private-key-connector';

const privateKey = import.meta.env.ALPHA_CONFIG_TEST_PRIVATE_KEY as
  | Hex
  | undefined;

const queryClient = new QueryClient();

const mockWagmiConfig = privateKey
  ? createConfig({
      connectors: [
        privateKeyConnector({
          privateKey,
          rpcUrls: {
            [mainnet.id]: import.meta.env.NEXT_PUBLIC_RPC_URL_MAINNET!,
            [arbitrum.id]: import.meta.env.NEXT_PUBLIC_RPC_URL_ARBITRUM!,
            [base.id]: import.meta.env.NEXT_PUBLIC_RPC_URL_BASE!,
          },
        }),
      ],
      chains: [mainnet, arbitrum, base],
      transports: {
        [mainnet.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_MAINNET),
        [arbitrum.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_ARBITRUM),
        [base.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_BASE),
      },
    })
  : undefined;

const AutoConnect = ({ children }: { children: React.ReactNode }) => {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && connectors[0]) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  return children;
};

export const WalletDecorator: Decorator = (Story) => {
  if (!mockWagmiConfig) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>ALPHA_CONFIG_TEST_PRIVATE_KEY env var not set.</p>
        <p className="mt-2 text-sm">
          Add it to your .env file and restart Storybook.
        </p>
      </div>
    );
  }

  return (
    <WagmiProvider config={mockWagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect>
          <Story />
        </AutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
