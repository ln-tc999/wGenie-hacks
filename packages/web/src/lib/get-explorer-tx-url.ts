import type { Address } from 'viem';

// Block explorer URLs for supported chains
const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  42161: 'https://arbiscan.io',
  8453: 'https://basescan.org',
  130: 'https://uniscan.xyz',
  43114: 'https://snowtrace.io',
  19011: 'https://explorer.plasma.network',
};

/**
 * Generate block explorer URL for a transaction
 * @param txHash - The transaction hash
 * @param chainId - The chain ID
 * @returns The block explorer URL for the transaction
 */
export const getExplorerTxUrl = (txHash: Address, chainId: number) => {
  const baseUrl = BLOCK_EXPLORERS[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
};
