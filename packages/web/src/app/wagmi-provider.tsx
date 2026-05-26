'use client';

import { WagmiProvider, http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  ALLOWED_CHAINS,
  ALLOWED_CHAIN_IDS,
  type ChainId,
} from './chains.config';

// Re-export for backwards compatibility
export {
  ALLOWED_CHAINS,
  ALLOWED_CHAIN_IDS,
  isValidChainId,
  chainIdSchema,
  allowedChainIdsSchema,
  type ChainId,
} from './chains.config';

const transports = {
  [ALLOWED_CHAIN_IDS[0]]: http(process.env.NEXT_PUBLIC_RPC_URL_MAINNET),
  [ALLOWED_CHAIN_IDS[1]]: http(process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM),
  [ALLOWED_CHAIN_IDS[2]]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE),
};

export const config = createConfig({
  chains: ALLOWED_CHAINS,
  connectors: [injected()],
  transports,
});

export const WagmiProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
};
