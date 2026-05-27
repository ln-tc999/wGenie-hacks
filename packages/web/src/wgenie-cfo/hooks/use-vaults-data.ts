'use client';

export interface MantleVaultData {
  id: string;
  name: string;
  vaultAddress: string;
  underlying: string;
  underlyingDecimals: number;
  apy7d: string | null;
  /** TVL in underlying token amount (human-readable, e.g. 7695.3 WETH) */
  tvlAmount: number | null;
  sharePriceFormatted: string | null;
  chainId: number;
}

export function useMantleVaultsData(_chainId: number) {
  return { data: undefined, isLoading: false };
}

const COINGECKO_TO_ADDRESS: Record<string, string> = {
  'usd-coin': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  ethereum: '0x4200000000000000000000000000000000000006',
  'coinbase-wrapped-btc': '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  'euro-coin': '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
};

export function useYoPrices(_chainId: number) {
  return { data: undefined, isLoading: false };
}
