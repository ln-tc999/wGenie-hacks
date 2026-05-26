import type { Address } from 'viem';

/**
 * Generate DeBank profile URL for an address
 * @param address - The wallet address
 * @returns The DeBank profile URL
 */
export const getDebankProfileUrl = (address: Address) => {
  return `https://debank.com/profile/${address}`;
};
