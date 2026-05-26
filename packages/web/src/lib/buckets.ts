const SECONDS_IN_DAY = 60 * 60 * 24;

export type BucketSize = '2_HOURS' | '8_HOURS' | '1_DAY' | '4_DAYS';

export const BUCKET_SIZE: Record<BucketSize, number> = {
  '2_HOURS': SECONDS_IN_DAY / 12,
  '8_HOURS': SECONDS_IN_DAY / 3,
  '1_DAY': SECONDS_IN_DAY,
  '4_DAYS': SECONDS_IN_DAY * 4,
};

export const getBucketId = (timestamp: number, bucketSize: BucketSize) => {
  const bucketSizeInSeconds = BUCKET_SIZE[bucketSize];
  return Math.floor(timestamp / bucketSizeInSeconds) * bucketSizeInSeconds;
};

export const PERIODS = ['7d', '30d', '90d', '1y'] as const;
export type Period = (typeof PERIODS)[number];

export const periodConfig: Record<
  Period,
  { bucketSize: BucketSize; bucketCount: number }
> = {
  '7d': { bucketSize: '2_HOURS', bucketCount: 84 },
  '30d': { bucketSize: '8_HOURS', bucketCount: 90 },
  '90d': { bucketSize: '1_DAY', bucketCount: 90 },
  '1y': { bucketSize: '4_DAYS', bucketCount: 91 },
};

type BucketTableName =
  | 'deposit_buckets_2_hours'
  | 'deposit_buckets_8_hours'
  | 'deposit_buckets_1_day'
  | 'deposit_buckets_4_days'
  | 'withdraw_buckets_2_hours'
  | 'withdraw_buckets_8_hours'
  | 'withdraw_buckets_1_day'
  | 'withdraw_buckets_4_days';

export const getDepositBucketTable = (bucketSize: BucketSize): BucketTableName => {
  switch (bucketSize) {
    case '2_HOURS': return 'deposit_buckets_2_hours';
    case '8_HOURS': return 'deposit_buckets_8_hours';
    case '1_DAY': return 'deposit_buckets_1_day';
    case '4_DAYS': return 'deposit_buckets_4_days';
  }
};

export const getWithdrawBucketTable = (bucketSize: BucketSize): BucketTableName => {
  switch (bucketSize) {
    case '2_HOURS': return 'withdraw_buckets_2_hours';
    case '8_HOURS': return 'withdraw_buckets_8_hours';
    case '1_DAY': return 'withdraw_buckets_1_day';
    case '4_DAYS': return 'withdraw_buckets_4_days';
  }
};
