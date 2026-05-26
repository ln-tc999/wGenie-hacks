import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { isAddress } from 'viem';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (isNaN(chainId) || !isAddress(address, { strict: false })) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const timeRange = (request.nextUrl.searchParams.get('timeRange') || '7d') as string;

  if (!PERIODS.includes(timeRange as Period)) {
    return NextResponse.json({ error: 'Invalid timeRange' }, { status: 400 });
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
    return NextResponse.json({ error: 'No buckets found' }, { status: 500 });
  }

  const depositTable = getDepositBucketTable(bucketSize);
  const withdrawTable = getWithdrawBucketTable(bucketSize);

  const [depositResult, withdrawResult] = await Promise.all([
    supabase
      .from(depositTable)
      .select('bucket_id, sum, count')
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .gte('bucket_id', startBucketId),
    supabase
      .from(withdrawTable)
      .select('bucket_id, sum, count')
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .gte('bucket_id', startBucketId),
  ]);

  const depositBuckets = depositResult.data ?? [];
  const withdrawBuckets = withdrawResult.data ?? [];

  const chartData = buckets.map((bucketId) => {
    const deposit = depositBuckets.find((b) => b.bucket_id === bucketId);
    const withdraw = withdrawBuckets.find((b) => b.bucket_id === bucketId);

    return {
      bucketId,
      deposit: {
        sum: deposit?.sum ?? '0',
        count: deposit?.count ?? 0,
      },
      withdraw: {
        sum: withdraw?.sum ?? '0',
        count: withdraw?.count ?? 0,
      },
    };
  });

  return NextResponse.json({ flowChart: { chartData } });
}
