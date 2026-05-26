'use client';

import { useMemo } from 'react';
import { useVaults, usePrices } from '@yo-protocol/react';

export interface YoVaultData {
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

/**
 * Fetches YO vault metadata (APR, TVL) via @yo-protocol/react useVaults() hook.
 * Requires YieldProvider ancestor.
 */
export function useYoVaultsData(_chainId: number) {
  const { vaults, isLoading } = useVaults();

  const data = useMemo(() => {
    if (!vaults) return undefined;
    return vaults.map((v) => ({
      id: v.id,
      name: v.name,
      vaultAddress: v.contracts.vaultAddress,
      underlying: v.asset.symbol,
      underlyingDecimals: v.asset.decimals,
      apy7d: v.yield['7d'],
      tvlAmount: v.tvl.formatted ? parseFloat(String(v.tvl.formatted)) : null,
      sharePriceFormatted: v.sharePrice.formatted,
      chainId: v.chain.id,
    }));
  }, [vaults]);

  return { data, isLoading };
}

/**
 * CoinGecko ID → token address mapping for Base chain.
 * getPrices() returns prices keyed by CoinGecko IDs, but our
 * components look up prices by token address.
 */
const COINGECKO_TO_ADDRESS: Record<string, string> = {
  'usd-coin': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  ethereum: '0x4200000000000000000000000000000000000006',
  'coinbase-wrapped-btc': '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  'euro-coin': '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
};

/**
 * Fetches token prices via @yo-protocol/react usePrices() hook.
 * Returns { data: Record<lowercase-token-address, usd-price>, isLoading }.
 * Requires YieldProvider ancestor.
 */
export function useYoPrices(_chainId: number) {
  const { prices, isLoading } = usePrices();

  const data = useMemo(() => {
    if (!prices) return undefined;
    const result: Record<string, number> = {};
    for (const [coingeckoId, usdPrice] of Object.entries(prices)) {
      const addr = COINGECKO_TO_ADDRESS[coingeckoId];
      if (addr) {
        result[addr] = usdPrice as number;
      }
    }
    return result;
  }, [prices]);

  return { data, isLoading };
}
