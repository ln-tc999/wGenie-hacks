import type { ChainId } from '@/app/wagmi-provider';
import { getChainById } from '@/lib/get-chain-by-id';
import type { Address } from 'viem';

/**
 * Generate block explorer URL using viem extractChain
 * @param address - The address to create the URL for
 * @param chainId - The chain ID to get the explorer URL for
 * @returns The block explorer URL
 */
export const getExplorerAddressUrl = (address: Address, chainId: ChainId) => {
  const chain = getChainById(chainId);

  return `${chain.blockExplorers.default.url}/address/${address}`;
};
