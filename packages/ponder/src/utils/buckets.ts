import schema from 'ponder:schema';

const SECONDS_IN_DAY = 60 * 60 * 24;

export type BucketSize = '2_HOURS' | '8_HOURS' | '1_DAY' | '4_DAYS';

export const BUCKET_SIZE: Record<BucketSize, number> = {
  '2_HOURS': SECONDS_IN_DAY / 12,
  '8_HOURS': SECONDS_IN_DAY / 3,
  '1_DAY': SECONDS_IN_DAY,
  '4_DAYS': SECONDS_IN_DAY * 4,
};

/**
 * @param timestamp - Unix timestamp in seconds
 * @param bucketSize - Size of the bucket
 * @returns The bucket ID unix timestamp in seconds
 */
export const getBucketId = (timestamp: number, bucketSize: BucketSize) => {
  const bucketSizeInSeconds = BUCKET_SIZE[bucketSize];
  return Math.floor(timestamp / bucketSizeInSeconds) * bucketSizeInSeconds;
};

export const getDepositBucketSchema = (bucketSize: BucketSize) => {
  switch (bucketSize) {
    case '2_HOURS':
      return schema.depositBuckets_2_HOURS;
    case '8_HOURS':
      return schema.depositBuckets_8_HOURS;
    case '1_DAY':
      return schema.depositBuckets_1_DAY;
    case '4_DAYS':
      return schema.depositBuckets_4_DAYS;
  }
};

export const getWithdrawBucketSchema = (bucketSize: BucketSize) => {
  switch (bucketSize) {
    case '1_DAY':
      return schema.withdrawBuckets_1_DAY;
    case '8_HOURS':
      return schema.withdrawBuckets_8_HOURS;
    case '2_HOURS':
      return schema.withdrawBuckets_2_HOURS;
    case '4_DAYS':
      return schema.withdrawBuckets_4_DAYS;
  }
};
