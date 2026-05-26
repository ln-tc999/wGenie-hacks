import { type Address, erc20Abi, formatUnits } from 'viem';
import { createYoClient } from '@yo-protocol/core';
import { getPublicClient } from './clients';
import { getFromCache, setInCache, getCacheKey } from './cache';

const erc4626Abi = [
  { inputs: [], name: 'totalAssets', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'asset', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

const plasmaVaultPriceOracleAbi = [
  { inputs: [], name: 'getPriceOracleMiddleware', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

const priceOracleAbi = [
  {
    inputs: [{ name: 'asset_', type: 'address' }],
    name: 'getAssetPrice',
    outputs: [
      { name: 'assetPrice', type: 'uint256' },
      { name: 'decimals', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface VaultRpcData {
  totalAssets: bigint;
  totalSupply: bigint;
  assetAddress: Address;
  assetSymbol: string;
  assetDecimals: number;
  sharePrice: number;
  assetUsdPrice: number;
  tvlUsd: number;
}

const DEFAULT_RPC_DATA: VaultRpcData = {
  totalAssets: 0n,
  totalSupply: 0n,
  assetAddress: '0x0000000000000000000000000000000000000000',
  assetSymbol: 'UNKNOWN',
  assetDecimals: 18,
  sharePrice: 0,
  assetUsdPrice: 0,
  tvlUsd: 0,
};

const isContractRevert = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'ContractFunctionExecutionError' ||
    error.name === 'ContractFunctionRevertedError');

// Fallback price source for vaults without getPriceOracleMiddleware (e.g. yo-vaults)
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  USDC: 'usd-coin',
  WETH: 'ethereum',
  cbBTC: 'coinbase-wrapped-btc',
  EURC: 'euro-coin',
  USDT: 'tether',
};

let _fallbackPrices: Record<string, number> | null = null;
let _fallbackFetchedAt = 0;
const FALLBACK_PRICE_TTL = 5 * 60 * 1000; // 5 minutes

async function getFallbackPrice(symbol: string): Promise<number> {
  const id = SYMBOL_TO_COINGECKO_ID[symbol];
  if (!id) return 0;

  const now = Date.now();
  if (!_fallbackPrices || now - _fallbackFetchedAt > FALLBACK_PRICE_TTL) {
    try {
      const client = createYoClient({ chainId: 8453 });
      const prices = await client.getPrices();
      _fallbackPrices = {};
      for (const [key, value] of Object.entries(prices)) {
        _fallbackPrices[key.toLowerCase()] = value as number;
      }
      _fallbackFetchedAt = now;
    } catch {
      return 0;
    }
  }

  return _fallbackPrices?.[id] ?? 0;
}

const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || isContractRevert(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
};

export const fetchVaultRpcData = async (
  chainId: number,
  vaultAddress: Address,
): Promise<VaultRpcData> => {
  const cacheKey = getCacheKey(chainId, vaultAddress);
  const cached = getFromCache<VaultRpcData>(cacheKey);
  if (cached) return cached;

  try {
    const client = getPublicClient(chainId);

    const vaultResults = await fetchWithRetry(() =>
      client.multicall({
        contracts: [
          { address: vaultAddress, abi: erc4626Abi, functionName: 'totalAssets' },
          { address: vaultAddress, abi: erc4626Abi, functionName: 'totalSupply' },
          { address: vaultAddress, abi: erc4626Abi, functionName: 'asset' },
        ],
      }),
    );

    const totalAssets = (vaultResults[0].result as bigint) ?? 0n;
    const totalSupply = (vaultResults[1].result as bigint) ?? 0n;
    const assetAddress = vaultResults[2].result as Address;

    if (!assetAddress) {
      setInCache(cacheKey, DEFAULT_RPC_DATA);
      return DEFAULT_RPC_DATA;
    }

    const assetResults = await fetchWithRetry(() =>
      client.multicall({
        contracts: [
          { address: assetAddress, abi: erc20Abi, functionName: 'symbol' },
          { address: assetAddress, abi: erc20Abi, functionName: 'decimals' },
        ],
      }),
    );

    const assetSymbol = (assetResults[0].result as string) ?? 'UNKNOWN';
    const assetDecimals = (assetResults[1].result as number) ?? 18;

    let sharePrice = 1.0;
    if (totalSupply > 0n) {
      sharePrice =
        Number(formatUnits(totalAssets, assetDecimals)) /
        Number(formatUnits(totalSupply, assetDecimals));
    }

    // Phase 3: Fetch price oracle and asset USD price
    let assetUsdPrice = 0;
    let tvlUsd = 0;
    try {
      const priceOracleAddress = await fetchWithRetry(() =>
        client.readContract({
          address: vaultAddress,
          abi: plasmaVaultPriceOracleAbi,
          functionName: 'getPriceOracleMiddleware',
        }),
      );

      const [rawPrice, priceDecimals] = await fetchWithRetry(() =>
        client.readContract({
          address: priceOracleAddress,
          abi: priceOracleAbi,
          functionName: 'getAssetPrice',
          args: [assetAddress],
        }),
      );

      assetUsdPrice = Number(formatUnits(rawPrice, Number(priceDecimals)));
      tvlUsd =
        Number(formatUnits(totalAssets, assetDecimals)) * assetUsdPrice;
    } catch (error) {
      const msg = error instanceof Error ? (error as Error & { shortMessage?: string }).shortMessage ?? error.message : String(error);
      console.warn(`Failed to fetch price for ${chainId}:${vaultAddress}: ${msg}`);
      // Fallback: try yo-protocol price API for known tokens
      assetUsdPrice = await getFallbackPrice(assetSymbol);
      if (assetUsdPrice > 0) {
        tvlUsd =
          Number(formatUnits(totalAssets, assetDecimals)) * assetUsdPrice;
      }
    }

    const data: VaultRpcData = {
      totalAssets,
      totalSupply,
      assetAddress,
      assetSymbol,
      assetDecimals,
      sharePrice,
      assetUsdPrice,
      tvlUsd,
    };

    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch RPC data for ${chainId}:${vaultAddress}`, error);
    setInCache(cacheKey, DEFAULT_RPC_DATA);
    return DEFAULT_RPC_DATA;
  }
};

export const fetchAllVaultsRpcData = async (
  vaults: Array<{ chainId: number; address: Address }>,
): Promise<Map<string, VaultRpcData>> => {
  const results = new Map<string, VaultRpcData>();

  const byChain = new Map<number, Address[]>();
  for (const vault of vaults) {
    const list = byChain.get(vault.chainId) || [];
    list.push(vault.address);
    byChain.set(vault.chainId, list);
  }

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, addresses]) => {
      await Promise.all(
        addresses.map(async (address) => {
          const data = await fetchVaultRpcData(chainId, address);
          results.set(getCacheKey(chainId, address), data);
        }),
      );
    }),
  );

  return results;
};
