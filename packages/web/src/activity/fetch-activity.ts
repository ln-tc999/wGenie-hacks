import { z } from 'zod';
import { type Address, formatUnits } from 'viem';
import { isHex } from 'viem';
import { addressSchema } from '@/lib/schema';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { APP_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { getCacheKey } from '@/lib/rpc/cache';
import { getUnixTime, subDays } from 'date-fns';

// Transaction hash schema (0x + 64 hex chars = 32 bytes)
const txHashSchema = z.string().refine(
  (val) => isHex(val) && val.length === 66,
  { message: 'Invalid transaction hash' }
);

// Activity item schema
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

export type ActivityItem = z.infer<typeof activityItemSchema>;

const activityResponseSchema = z.object({
  activities: z.array(activityItemSchema),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ActivityResponse = z.infer<typeof activityResponseSchema>;

// Inflows schema
const inflowsPeriodSchema = z.object({
  deposits: z.number(),
  withdrawals: z.number(),
  net: z.number(),
});

const inflowsResponseSchema = z.object({
  inflows: z.object({
    day1: inflowsPeriodSchema,
    day7: inflowsPeriodSchema,
    day30: inflowsPeriodSchema,
  }),
});

export type InflowsResponse = z.infer<typeof inflowsResponseSchema>;

// Metadata schema
const chainMetadataSchema = z.object({
  chainId: z.number(),
  name: z.string(),
});

const vaultMetadataSchema = z.object({
  chainId: z.number(),
  address: addressSchema,
  name: z.string(),
  assetAddress: addressSchema,
  assetSymbol: z.string(),
});

const activityMetadataSchema = z.object({
  chains: z.array(chainMetadataSchema),
  vaults: z.array(vaultMetadataSchema),
});

export type ActivityMetadata = z.infer<typeof activityMetadataSchema>;

// Search params interface
export interface ActivitySearchParams {
  chains?: string;
  vaults?: string;
  type?: string;
  min_amount?: string;
  depositor?: string;
}

// --- Cursor helpers ---

function parseCursor(cursor: string): { timestamp: number; id: string } | null {
  const parts = cursor.split(':');
  if (parts.length < 2) return null;
  const timestampStr = parts[0];
  if (!timestampStr) return null;
  const timestamp = parseInt(timestampStr, 10);
  const id = parts.slice(1).join(':');
  if (isNaN(timestamp) || !id) return null;
  return { timestamp, id };
}

function encodeCursor(timestamp: number, id: string): string {
  return `${timestamp}:${id}`;
}

// --- Main fetch functions ---

export async function fetchActivity(
  params: ActivitySearchParams,
  cursor?: string
): Promise<ActivityResponse> {
  const limit = 50;
  const cursorData = cursor ? parseCursor(cursor) : null;

  const chainIds = params.chains
    ? params.chains.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !isNaN(c))
    : null;
  const vaultAddresses = params.vaults
    ? params.vaults.split(',').map((v) => v.trim().toLowerCase())
    : null;
  const depositorAddress = params.depositor
    ? params.depositor.trim().toLowerCase()
    : null;

  // Vault lookup for names
  const vaultLookup = new Map<string, { name: string; chainId: number }>();
  for (const vault of APP_VAULTS) {
    vaultLookup.set(
      `${vault.chainId}:${vault.address.toLowerCase()}`,
      { name: vault.name, chainId: vault.chainId },
    );
  }

  // RPC data for amount formatting
  const vaultsForRpc = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address,
  }));
  const rpcDataMap = await fetchAllVaultsRpcData(vaultsForRpc);

  type ActivityRow = {
    id: string;
    type: 'deposit' | 'withdraw';
    chain_id: number;
    vault_address: string;
    depositor_address: string;
    assets: string;
    timestamp: number;
    transaction_hash: string;
  };

  const activityType = params.type || 'all';

  // Fetch deposits
  let deposits: ActivityRow[] = [];
  if (activityType === 'all' || activityType === 'deposit') {
    let q = supabase
      .from('deposit_event')
      .select('id, chain_id, vault_address, receiver, assets, timestamp, transaction_hash')
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);
    if (depositorAddress) q = q.eq('receiver', depositorAddress);
    if (cursorData) {
      q = q.or(`timestamp.lt.${cursorData.timestamp},and(timestamp.eq.${cursorData.timestamp},id.lt.${cursorData.id})`);
    }

    const { data } = await q;
    if (data) {
      deposits = data.map((d) => ({
        id: d.id,
        type: 'deposit' as const,
        chain_id: d.chain_id,
        vault_address: d.vault_address,
        depositor_address: d.receiver,
        assets: d.assets,
        timestamp: d.timestamp,
        transaction_hash: d.transaction_hash,
      }));
    }
  }

  // Fetch withdrawals
  let withdrawals: ActivityRow[] = [];
  if (activityType === 'all' || activityType === 'withdraw') {
    let q = supabase
      .from('withdrawal_event')
      .select('id, chain_id, vault_address, owner, assets, timestamp, transaction_hash')
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);
    if (depositorAddress) q = q.eq('owner', depositorAddress);
    if (cursorData) {
      q = q.or(`timestamp.lt.${cursorData.timestamp},and(timestamp.eq.${cursorData.timestamp},id.lt.${cursorData.id})`);
    }

    const { data } = await q;
    if (data) {
      withdrawals = data.map((w) => ({
        id: w.id,
        type: 'withdraw' as const,
        chain_id: w.chain_id,
        vault_address: w.vault_address,
        depositor_address: w.owner,
        assets: w.assets,
        timestamp: w.timestamp,
        transaction_hash: w.transaction_hash,
      }));
    }
  }

  // Merge and sort
  const combined = [...deposits, ...withdrawals].sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    return b.id.localeCompare(a.id);
  });

  const hasMore = combined.length > limit;
  const activities = combined.slice(0, limit);

  // Enrich
  const enrichedActivities = activities
    .map((activity) => {
      const vaultKey = `${activity.chain_id}:${activity.vault_address.toLowerCase()}`;
      const vaultInfo = vaultLookup.get(vaultKey);
      const rpcKey = getCacheKey(activity.chain_id, activity.vault_address);
      const rpcData = rpcDataMap.get(rpcKey);

      const assetAmount = rpcData?.assetDecimals
        ? Number(formatUnits(BigInt(activity.assets), rpcData.assetDecimals))
        : Number(formatUnits(BigInt(activity.assets), 18));

      return {
        id: activity.id,
        type: activity.type,
        chainId: activity.chain_id,
        vaultAddress: activity.vault_address as Address,
        vaultName: vaultInfo?.name ?? 'Unknown Vault',
        depositorAddress: activity.depositor_address as Address,
        amount: assetAmount,
        assetAmount: String(activity.assets),
        assetSymbol: rpcData?.assetSymbol ?? 'UNKNOWN',
        assetAddress: (rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000') as Address,
        assetDecimals: rpcData?.assetDecimals ?? 18,
        transactionHash: activity.transaction_hash as Address,
        timestamp: activity.timestamp,
      };
    })
    .filter((activity) => {
      if (params.min_amount) {
        return activity.amount >= Number(params.min_amount);
      }
      return true;
    });

  const lastActivity = enrichedActivities[enrichedActivities.length - 1];
  const nextCursor =
    hasMore && lastActivity
      ? encodeCursor(lastActivity.timestamp, lastActivity.id)
      : null;

  return activityResponseSchema.parse({
    activities: enrichedActivities,
    pagination: { nextCursor, hasMore },
  });
}

// Fetch inflows summary (server-side)
export async function fetchActivityInflows(
  chains?: string,
  vaults?: string
): Promise<InflowsResponse> {
  const chainIds = chains
    ? chains.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !isNaN(c))
    : null;
  const vaultAddresses = vaults
    ? vaults.split(',').map((v) => v.trim().toLowerCase())
    : null;

  const now = new Date();
  const day1Ago = getUnixTime(subDays(now, 1));
  const day7Ago = getUnixTime(subDays(now, 7));
  const day30Ago = getUnixTime(subDays(now, 30));

  const fetchDepositSum = async (sinceTimestamp: number): Promise<bigint> => {
    let q = supabase
      .from('deposit_event')
      .select('assets')
      .gte('timestamp', sinceTimestamp);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);

    const { data } = await q;
    return data?.reduce((acc, r) => acc + BigInt(r.assets), 0n) ?? 0n;
  };

  const fetchWithdrawSum = async (sinceTimestamp: number): Promise<bigint> => {
    let q = supabase
      .from('withdrawal_event')
      .select('assets')
      .gte('timestamp', sinceTimestamp);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);

    const { data } = await q;
    return data?.reduce((acc, r) => acc + BigInt(r.assets), 0n) ?? 0n;
  };

  const [deposits1d, deposits7d, deposits30d, withdrawals1d, withdrawals7d, withdrawals30d] =
    await Promise.all([
      fetchDepositSum(day1Ago),
      fetchDepositSum(day7Ago),
      fetchDepositSum(day30Ago),
      fetchWithdrawSum(day1Ago),
      fetchWithdrawSum(day7Ago),
      fetchWithdrawSum(day30Ago),
    ]);

  const formatAmount = (amount: bigint) => {
    const isNegative = amount < 0n;
    const absAmount = isNegative ? -amount : amount;
    const formatted = Number(formatUnits(absAmount, 18));
    if (!Number.isFinite(formatted)) return 0;
    return isNegative ? -formatted : formatted;
  };

  const calculatePeriod = (deposits: bigint, withdrawals: bigint) => ({
    deposits: formatAmount(deposits),
    withdrawals: formatAmount(withdrawals),
    net: formatAmount(deposits) - formatAmount(withdrawals),
  });

  return inflowsResponseSchema.parse({
    inflows: {
      day1: calculatePeriod(deposits1d, withdrawals1d),
      day7: calculatePeriod(deposits7d, withdrawals7d),
      day30: calculatePeriod(deposits30d, withdrawals30d),
    },
  });
}

// Fetch activity metadata (server-side)
export async function fetchActivityMetadata(): Promise<ActivityMetadata> {
  const vaultChainIds = new Set(APP_VAULTS.map((v) => v.chainId));

  // Build chain list from known chains
  const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    8453: 'Base',
    43114: 'Avalanche',
    130: 'Unichain',
    9745: 'Sonic',
  };

  const chainList = Array.from(vaultChainIds)
    .sort((a, b) => a - b)
    .map((chainId) => ({
      chainId,
      name: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    }));

  // Fetch RPC data for asset info
  const vaultsForRpc = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address,
  }));
  const rpcDataMap = await fetchAllVaultsRpcData(vaultsForRpc);

  const vaultList = APP_VAULTS.map((vault) => {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const rpcData = rpcDataMap.get(rpcKey);
    return {
      chainId: vault.chainId,
      address: vault.address as Address,
      name: vault.name,
      assetAddress: (rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000') as Address,
      assetSymbol: rpcData?.assetSymbol ?? 'UNKNOWN',
    };
  });

  return activityMetadataSchema.parse({
    chains: chainList,
    vaults: vaultList,
  });
}
