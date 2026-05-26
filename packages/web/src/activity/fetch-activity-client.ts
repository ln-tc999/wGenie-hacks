import { z } from 'zod';
import { addressSchema } from '@/lib/schema';
import { isHex } from 'viem';
import type { ActivitySearchParams } from './fetch-activity';

// Transaction hash schema (0x + 64 hex chars = 32 bytes)
const txHashSchema = z.string().refine(
  (val) => isHex(val) && val.length === 66,
  { message: 'Invalid transaction hash' }
);

// Activity item schema (same as server-side)
const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['deposit', 'withdraw']),
  chainId: z.number(),
  vaultAddress: addressSchema,
  vaultName: z.string(),
  depositorAddress: addressSchema,
  amount: z.number(),
  assetAmount: z.string(),
  assetSymbol: z.string(),
  assetAddress: addressSchema,
  assetDecimals: z.number(),
  transactionHash: txHashSchema,
  timestamp: z.number(),
});

const activityResponseSchema = z.object({
  activities: z.array(activityItemSchema),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ClientActivityResponse = z.infer<typeof activityResponseSchema>;

/**
 * Client-side fetch for activity data (for infinite scroll)
 */
export async function fetchActivityClient(
  params: ActivitySearchParams,
  cursor?: string
): Promise<ClientActivityResponse> {
  const searchParams = new URLSearchParams();

  if (cursor) searchParams.set('cursor', cursor);
  if (params.chains) searchParams.set('chains', params.chains);
  if (params.vaults) searchParams.set('vaults', params.vaults);
  if (params.type && params.type !== 'all') searchParams.set('type', params.type);
  if (params.min_amount) searchParams.set('min_amount', params.min_amount);
  if (params.depositor) searchParams.set('depositor', params.depositor);

  searchParams.set('limit', '50');

  const response = await fetch(`/api/activity?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch activity: ${response.statusText}`);
  }
  const data = await response.json();
  return activityResponseSchema.parse(data);
}
