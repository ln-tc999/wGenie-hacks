import { formatUnits, type Address } from 'viem';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { APP_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { fetchAllAssetPrices } from '@/lib/rpc/asset-prices';
import { getCacheKey } from '@/lib/rpc/cache';
import { BUCKET_SIZE, getBucketId } from '@/lib/buckets';
import { getUnixTime } from 'date-fns';

export interface DashboardMetrics {
  totalTvlUsd: number;
  totalVaults: number;
  activeDepositors: number;
  netFlow7dUsd: number;
  volume7dUsd: number;
}

/**
 * Convert a bucket sum to USD.
 * Supabase may return `sum` as either a string ("123456") or a JS number (3.51e+22).
 */
function bucketSumToUsd(
  sum: string | number,
  assetDecimals: number,
  usdPrice: bigint,
  priceDecimals: number,
): number {
  let amountDecimal: number;
  if (typeof sum === 'string') {
    amountDecimal = Number(formatUnits(BigInt(sum), assetDecimals));
  } else {
    amountDecimal = sum / 10 ** assetDecimals;
  }
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const vaults = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));

  // 7d bucket range
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, '2_HOURS');
  const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS'];

  // Fetch all data sources in parallel
  const [rpcDataMap, assetPrices, depositorsResult, depositBuckets, withdrawBuckets] =
    await Promise.all([
      fetchAllVaultsRpcData(vaults),
      fetchAllAssetPrices(),
      supabase
        .from('depositor')
        .select('depositor_address')
        .gt('share_balance', '0'),
      supabase
        .from('deposit_buckets_2_hours')
        .select('vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
      supabase
        .from('withdraw_buckets_2_hours')
        .select('vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
    ]);

  // 1. Total TVL — sum all vault tvlUsd from RPC
  let totalTvlUsd = 0;
  for (const vault of vaults) {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const rpcData = rpcDataMap.get(rpcKey);
    if (rpcData) totalTvlUsd += rpcData.tvlUsd;
  }

  // 2. Total vaults
  const totalVaults = APP_VAULTS.length;

  // 3. Unique active depositors (distinct addresses across all vaults)
  const uniqueAddresses = new Set(
    (depositorsResult.data ?? []).map((r) =>
      (r.depositor_address as string).toLowerCase(),
    ),
  );
  const activeDepositors = uniqueAddresses.size;

  // 4 & 5. 7d net flow and volume from buckets
  let totalDepositsUsd = 0;
  let totalWithdrawalsUsd = 0;

  for (const row of depositBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    totalDepositsUsd += bucketSumToUsd(
      row.sum,
      priceInfo.assetDecimals,
      priceInfo.usdPrice,
      priceInfo.priceDecimals,
    );
  }

  for (const row of withdrawBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    totalWithdrawalsUsd += bucketSumToUsd(
      row.sum,
      priceInfo.assetDecimals,
      priceInfo.usdPrice,
      priceInfo.priceDecimals,
    );
  }

  return {
    totalTvlUsd,
    totalVaults,
    activeDepositors,
    netFlow7dUsd: totalDepositsUsd - totalWithdrawalsUsd,
    volume7dUsd: totalDepositsUsd + totalWithdrawalsUsd,
  };
}
