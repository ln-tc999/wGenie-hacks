import { type Address, formatUnits } from 'viem';
import { getPublicClient } from './clients';
import { getFromCache, setInCache } from './cache';
import { APP_VAULTS } from '@/lib/vaults-registry';
import { fetchVaultRpcData } from './vault-rpc-data';

const plasmaVaultAbi = [
  {
    inputs: [],
    name: 'getPriceOracleMiddleware',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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

export interface AssetPriceInfo {
  assetAddress: Address;
  assetDecimals: number;
  usdPrice: bigint;
  priceDecimals: number;
}

/**
 * Converts a raw asset amount to USD using price oracle data.
 */
export function toUsd(
  amount: bigint,
  assetDecimals: number,
  usdPrice: bigint,
  priceDecimals: number,
): number {
  const amountDecimal = Number(formatUnits(amount, assetDecimals));
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

/**
 * Fetches USD prices for all vault assets using multicall batching.
 * Groups vaults by chain and makes 2 multicalls per chain:
 * 1. getPriceOracleMiddleware() for all vaults on that chain
 * 2. getAssetPrice(assetAddress) for all vaults on that chain
 *
 * Results cached for 10 minutes.
 *
 * @returns Map from "chainId:vaultAddress" → AssetPriceInfo
 */
export async function fetchAllAssetPrices(): Promise<
  Map<string, AssetPriceInfo>
> {
  const cacheKey = 'global:asset-prices';
  const cached = getFromCache<Map<string, AssetPriceInfo>>(cacheKey);
  if (cached) return cached;

  const results = new Map<string, AssetPriceInfo>();

  // Group vaults by chain for batched RPC calls
  const byChain = new Map<number, typeof APP_VAULTS>();
  for (const vault of APP_VAULTS) {
    const list = byChain.get(vault.chainId) || [];
    list.push(vault);
    byChain.set(vault.chainId, list);
  }

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, vaults]) => {
      const client = getPublicClient(chainId);

      // Step 1: Fetch assetAddress + assetDecimals for all vaults (already cached per-vault)
      const rpcDataMap = new Map<
        string,
        { assetAddress: Address; assetDecimals: number }
      >();
      await Promise.all(
        vaults.map(async (vault) => {
          try {
            const rpcData = await fetchVaultRpcData(
              chainId,
              vault.address as Address,
            );
            if (
              rpcData.assetAddress &&
              rpcData.assetAddress !==
                '0x0000000000000000000000000000000000000000'
            ) {
              rpcDataMap.set(vault.address.toLowerCase(), {
                assetAddress: rpcData.assetAddress,
                assetDecimals: rpcData.assetDecimals,
              });
            }
          } catch (error) {
            console.error(
              `Failed to fetch RPC data for ${chainId}:${vault.address}`,
              error,
            );
          }
        }),
      );

      const validVaults = vaults.filter((v) =>
        rpcDataMap.has(v.address.toLowerCase()),
      );
      if (validVaults.length === 0) return;

      try {
        // Step 2: Multicall getPriceOracleMiddleware() for all vaults on this chain
        const oracleResults = await client.multicall({
          contracts: validVaults.map((vault) => ({
            address: vault.address as Address,
            abi: plasmaVaultAbi,
            functionName: 'getPriceOracleMiddleware' as const,
          })),
          allowFailure: true,
        });

        // Step 3: Multicall getAssetPrice() for all vaults using their oracle addresses
        const priceContracts = validVaults
          .map((vault, i) => {
            const oracleResult = oracleResults[i];
            const rpcData = rpcDataMap.get(vault.address.toLowerCase());
            if (
              !oracleResult ||
              oracleResult.status === 'failure' ||
              !oracleResult.result ||
              !rpcData
            )
              return null;
            return {
              address: oracleResult.result as Address,
              abi: priceOracleAbi,
              functionName: 'getAssetPrice' as const,
              args: [rpcData.assetAddress] as const,
              vaultAddress: vault.address.toLowerCase(),
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        if (priceContracts.length === 0) return;

        const priceResults = await client.multicall({
          contracts: priceContracts.map(
            ({ address, abi, functionName, args }) => ({
              address,
              abi,
              functionName,
              args,
            }),
          ),
          allowFailure: true,
        });

        // Step 4: Build results map
        priceContracts.forEach((contract, i) => {
          const priceResult = priceResults[i];
          if (
            !priceResult ||
            priceResult.status === 'failure' ||
            !priceResult.result
          )
            return;

          const [price, decimals] = priceResult.result as [bigint, bigint];
          const rpcData = rpcDataMap.get(contract.vaultAddress);
          if (!rpcData) return;

          const key = `${chainId}:${contract.vaultAddress}`;
          results.set(key, {
            assetAddress: rpcData.assetAddress,
            assetDecimals: rpcData.assetDecimals,
            usdPrice: price,
            priceDecimals: Number(decimals),
          });
        });
      } catch (error) {
        console.error(
          `Failed to fetch prices for chain ${chainId}`,
          error,
        );
      }
    }),
  );

  setInCache(cacheKey, results);
  return results;
}
