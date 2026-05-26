import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { getUnixTime } from 'date-fns';
import {
  BUCKET_SIZE,
  getBucketId,
  getDepositBucketTable,
  getWithdrawBucketTable,
  periodConfig,
  type Period,
  PERIODS,
} from '@/lib/buckets';
import { fetchAllAssetPrices } from '@/lib/rpc/asset-prices';
import { formatUnits } from 'viem';

/**
 * Convert a bucket sum to USD.
 * Supabase may return `sum` as either a string ("123456") or a JS number (3.51e+22).
 * We handle both by converting to BigInt when possible, or using Number directly.
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
    // Supabase returned a JS number (possibly in scientific notation)
    amountDecimal = sum / 10 ** assetDecimals;
  }
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

export async function GET(request: NextRequest) {
  try {
    const timeRange = (request.nextUrl.searchParams.get('timeRange') ||
      '7d') as string;

    if (!PERIODS.includes(timeRange as Period)) {
      return NextResponse.json(
        { error: 'Invalid timeRange' },
        { status: 400 },
      );
    }

    const period = timeRange as Period;
    const { bucketCount, bucketSize } = periodConfig[period];
    const now = getUnixTime(new Date());
    const endBucketId = getBucketId(now, bucketSize);

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      return endBucketId - (bucketCount - 1 - i) * BUCKET_SIZE[bucketSize];
    });

    const startBucketId = buckets[0];
    if (startBucketId === undefined) {
      return NextResponse.json(
        { error: 'No buckets found' },
        { status: 500 },
      );
    }

    const depositTable = getDepositBucketTable(bucketSize);
    const withdrawTable = getWithdrawBucketTable(bucketSize);

    // Fetch ALL bucket data (no vault_address filter) and asset prices in parallel
    const [depositResult, withdrawResult, assetPrices] = await Promise.all([
      supabase
        .from(depositTable)
        .select('bucket_id, vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
      supabase
        .from(withdrawTable)
        .select('bucket_id, vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
      fetchAllAssetPrices(),
    ]);

    const depositBuckets = depositResult.data ?? [];
    const withdrawBuckets = withdrawResult.data ?? [];

    // Aggregate by bucket_id, converting each vault's amounts to USD
    const chartData = buckets.map((bucketId) => {
      let depositUsd = 0;
      let withdrawUsd = 0;

      for (const row of depositBuckets) {
        if (row.bucket_id !== bucketId) continue;
        const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
        const priceInfo = assetPrices.get(key);
        if (!priceInfo) continue;
        depositUsd += bucketSumToUsd(
          row.sum,
          priceInfo.assetDecimals,
          priceInfo.usdPrice,
          priceInfo.priceDecimals,
        );
      }

      for (const row of withdrawBuckets) {
        if (row.bucket_id !== bucketId) continue;
        const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
        const priceInfo = assetPrices.get(key);
        if (!priceInfo) continue;
        withdrawUsd += bucketSumToUsd(
          row.sum,
          priceInfo.assetDecimals,
          priceInfo.usdPrice,
          priceInfo.priceDecimals,
        );
      }

      return {
        bucketId,
        depositUsd,
        withdrawUsd,
      };
    });

    return NextResponse.json({ flowChart: { chartData } });
  } catch (error) {
    console.error('Global flow chart API error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
