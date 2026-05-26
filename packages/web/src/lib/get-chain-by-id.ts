import { extractChain } from 'viem';
import { ALLOWED_CHAINS } from '@/app/wagmi-provider';
import type { ChainId } from '@/app/wagmi-provider';

/**
 * Get a chain by its ID using viem's extractChain
 * @param chainId - The chain ID to look up
 * @returns The chain object if found, undefined otherwise
 */
export const getChainById = (chainId: ChainId) => {
  const chain = extractChain({
    chains: ALLOWED_CHAINS,
    id: chainId,
  });

  if (!chain) {
    throw new Error(`Chain ID ${chainId} is not supported`);
  }

  return chain;
};
