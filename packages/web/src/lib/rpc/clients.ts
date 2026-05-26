import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, arbitrum, base, unichain, avalanche, plasma } from 'viem/chains';

const chains = [mainnet, arbitrum, base, unichain, avalanche, plasma] as const;

const RPC_URLS: Record<number, string | undefined> = {
  [mainnet.id]: process.env.RPC_URL_MAINNET || process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
  [arbitrum.id]: process.env.RPC_URL_ARBITRUM || process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM,
  [base.id]: process.env.RPC_URL_BASE || process.env.NEXT_PUBLIC_RPC_URL_BASE,
  [unichain.id]: process.env.RPC_URL_UNICHAIN || process.env.NEXT_PUBLIC_RPC_URL_UNICHAIN,
  [avalanche.id]: process.env.RPC_URL_AVALANCHE || process.env.NEXT_PUBLIC_RPC_URL_AVALANCHE,
  [plasma.id]: process.env.RPC_URL_PLASMA || process.env.NEXT_PUBLIC_RPC_URL_PLASMA,
};

const clientCache = new Map<number, PublicClient>();

export const getPublicClient = (chainId: number): PublicClient => {
  const cached = clientCache.get(chainId);
  if (cached) return cached;

  const chain = chains.find((c) => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const client = createPublicClient({
    chain,
    transport: http(RPC_URLS[chainId], {
      timeout: 10_000,
    }),
  });

  clientCache.set(chainId, client as PublicClient);
  return client as PublicClient;
};
