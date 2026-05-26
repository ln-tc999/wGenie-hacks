import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { RPC_URLS } from '../../../env';

/**
 * Supported chains mapping by chain ID
 * Starting with Ethereum, Base, and Arbitrum
 */
export const SUPPORTED_CHAINS: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
  8453: base,
};

/**
 * Chain name mapping for display
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
};

/**
 * Cache for public clients to avoid recreating them
 */
const clientCache = new Map<number, PublicClient>();

/**
 * Get or create a public client for a specific chain
 *
 * @param chainId - The chain ID to create a client for
 * @returns A viem PublicClient configured for the specified chain
 * @throws Error if the chain is not supported or RPC URL is not configured
 */
export function getPublicClient(chainId: number): PublicClient {
  // Check cache first
  const cached = clientCache.get(chainId);
  if (cached) {
    return cached;
  }

  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chains: ${Object.entries(CHAIN_NAMES)
        .map(([id, name]) => `${name} (${id})`)
        .join(', ')}`,
    );
  }

  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) {
    throw new Error(
      `RPC URL not configured for chain ${CHAIN_NAMES[chainId]}. ` +
        `Please set the corresponding environment variable (e.g., ETHEREUM_RPC_URL for Ethereum).`,
    );
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  clientCache.set(chainId, client);
  return client;
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in SUPPORTED_CHAINS && RPC_URLS[chainId] !== undefined;
}

/**
 * Get all supported chain IDs that have RPC URLs configured
 */
export function getConfiguredChainIds(): number[] {
  return Object.keys(SUPPORTED_CHAINS)
    .map(Number)
    .filter((chainId) => RPC_URLS[chainId] !== undefined);
}
