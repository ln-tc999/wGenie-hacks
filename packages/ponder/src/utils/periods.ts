import z from 'zod';
import { BucketSize } from './buckets';

export const PERIODS = ['7d', '30d', '90d', '1y'] as const;

export const periodSchema = z.enum(PERIODS);

export type Period = z.infer<typeof periodSchema>;

/**
 * @description Config for the period
 * @dev Try each period to contain ~100 buckets
 * @dev Try to bucketSize * bucketCount = period
 */
export const periodConfig: Record<
  Period,
  {
    bucketSize: BucketSize;
    bucketCount: number;
  }
> = {
  '7d': {
    bucketSize: '2_HOURS',
    bucketCount: 84,
  },
  '30d': {
    bucketSize: '8_HOURS',
    bucketCount: 90,
  },
  '90d': {
    bucketSize: '1_DAY',
    bucketCount: 90,
  },
  '1y': {
    bucketSize: '4_DAYS',
    bucketCount: 91,
  },
};
