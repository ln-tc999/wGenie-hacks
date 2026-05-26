import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { z } from 'zod';
import { type Address, formatUnits } from 'viem';
import { APP_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { getCacheKey } from '@/lib/rpc/cache';

const activityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  chains: z.string().optional(),
  vaults: z.string().optional(),
  type: z.enum(['deposit', 'withdraw', 'all']).default('all'),
  min_amount: z.coerce.number().optional(),
  depositor: z.string().optional(),
});

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

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const queryResult = activityQuerySchema.safeParse(searchParams);

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.flatten() },
      { status: 400 },
    );
  }

  const query = queryResult.data;
  const cursorData = query.cursor ? parseCursor(query.cursor) : null;

  const chainIds = query.chains
    ? query.chains.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !isNaN(c))
    : null;
  const vaultAddresses = query.vaults
    ? query.vaults.split(',').map((v) => v.trim().toLowerCase())
    : null;
  const depositorAddress = query.depositor
    ? query.depositor.trim().toLowerCase()
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

  // Fetch deposits
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

  let deposits: ActivityRow[] = [];
  if (query.type === 'all' || query.type === 'deposit') {
    let q = supabase
      .from('deposit_event')
      .select('id, chain_id, vault_address, receiver, assets, timestamp, transaction_hash')
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(query.limit + 1);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);
    if (depositorAddress) q = q.eq('receiver', depositorAddress);
    if (cursorData) {
      q = q.or(`timestamp.lt.${cursorData.timestamp},and(timestamp.eq.${cursorData.timestamp},id.lt.${cursorData.id})`);
    }

    const { data, error } = await q;
    if (!error && data) {
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
  if (query.type === 'all' || query.type === 'withdraw') {
    let q = supabase
      .from('withdrawal_event')
      .select('id, chain_id, vault_address, owner, assets, timestamp, transaction_hash')
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(query.limit + 1);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);
    if (depositorAddress) q = q.eq('owner', depositorAddress);
    if (cursorData) {
      q = q.or(`timestamp.lt.${cursorData.timestamp},and(timestamp.eq.${cursorData.timestamp},id.lt.${cursorData.id})`);
    }

    const { data, error } = await q;
    if (!error && data) {
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

  const hasMore = combined.length > query.limit;
  const activities = combined.slice(0, query.limit);

  // Enrich with RPC data
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
      if (query.min_amount !== undefined) {
        return activity.amount >= query.min_amount;
      }
      return true;
    });

  const lastActivity = enrichedActivities[enrichedActivities.length - 1];
  const nextCursor =
    hasMore && lastActivity
      ? encodeCursor(lastActivity.timestamp, lastActivity.id)
      : null;

  return NextResponse.json({
    activities: enrichedActivities,
    pagination: { nextCursor, hasMore },
  });
}
