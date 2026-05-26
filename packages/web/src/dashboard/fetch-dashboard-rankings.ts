import { formatUnits, type Address } from 'viem';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { APP_VAULTS, getVaultFromRegistry } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { fetchAllAssetPrices } from '@/lib/rpc/asset-prices';
import { getCacheKey } from '@/lib/rpc/cache';
import { BUCKET_SIZE, getBucketId } from '@/lib/buckets';
import { getUnixTime, subDays } from 'date-fns';

// --- Types ---

export interface VaultRanking {
  vaultAddress: string;
  chainId: number;
  vaultName: string;
  deposit7dUsd: number;
}

export interface LargestTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  chainId: number;
  vaultAddress: string;
  vaultName: string;
  depositorAddress: string;
  amountUsd: number;
  assetSymbol: string;
  transactionHash: string;
  timestamp: number;
}

export interface TopDepositor {
  address: string;
  totalBalanceUsd: number;
  vaultCount: number;
}

export interface DashboardRankings {
  topVaults: VaultRanking[];
  bottomVaults: VaultRanking[];
  largestDeposits: LargestTransaction[];
  largestWithdrawals: LargestTransaction[];
  topDepositors: TopDepositor[];
}

// --- Helpers ---

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

function shareBalanceToDecimal(
  raw: string | number,
  assetDecimals: number,
): number {
  if (typeof raw === 'number') {
    return raw / 10 ** assetDecimals;
  }
  try {
    return Number(formatUnits(BigInt(raw), assetDecimals));
  } catch {
    return 0;
  }
}

// --- Main fetch ---

const MIN_USD_FOR_VAULT_COUNT = 10;

export async function fetchDashboardRankings(): Promise<DashboardRankings> {
  const vaults = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));

  // 7d time range
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, '2_HOURS');
  const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS'];
  const sevenDaysAgo = getUnixTime(subDays(new Date(), 7));

  // Parallel fetch all data sources
  const [
    rpcDataMap,
    assetPrices,
    depositBuckets,
    depositEvents,
    withdrawEvents,
    depositorRows,
  ] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllAssetPrices(),
    supabase
      .from('deposit_buckets_2_hours')
      .select('vault_address, chain_id, sum')
      .gte('bucket_id', startBucketId),
    supabase
      .from('deposit_event')
      .select(
        'id, chain_id, vault_address, receiver, assets, timestamp, transaction_hash',
      )
      .gte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(1000),
    supabase
      .from('withdrawal_event')
      .select(
        'id, chain_id, vault_address, owner, assets, timestamp, transaction_hash',
      )
      .gte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(1000),
    supabase
      .from('depositor')
      .select('depositor_address, vault_address, chain_id, share_balance')
      .gt('share_balance', '0'),
  ]);

  // --- 1. Vault Rankings by 7d Deposit Volume ---
  const vaultDepositMap = new Map<
    string,
    { chainId: number; vaultName: string; total: number }
  >();

  for (const vault of APP_VAULTS) {
    const key = `${vault.chainId}:${vault.address.toLowerCase()}`;
    vaultDepositMap.set(key, {
      chainId: vault.chainId,
      vaultName: vault.name,
      total: 0,
    });
  }

  for (const row of depositBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    const usd = bucketSumToUsd(
      row.sum,
      priceInfo.assetDecimals,
      priceInfo.usdPrice,
      priceInfo.priceDecimals,
    );
    const existing = vaultDepositMap.get(key);
    if (existing) existing.total += usd;
  }

  const allVaultRankings: VaultRanking[] = Array.from(
    vaultDepositMap.entries(),
  ).map(([key, data]) => ({
    vaultAddress: key.split(':')[1]!,
    chainId: data.chainId,
    vaultName: data.vaultName,
    deposit7dUsd: data.total,
  }));

  const topVaults = [...allVaultRankings]
    .sort((a, b) => b.deposit7dUsd - a.deposit7dUsd)
    .slice(0, 10);

  const bottomVaults = [...allVaultRankings]
    .sort((a, b) => a.deposit7dUsd - b.deposit7dUsd)
    .slice(0, 10);

  // --- 2. Largest Individual Transactions ---
  const enrichTransaction = (
    row: {
      id: string;
      chain_id: number;
      vault_address: string;
      assets: string;
      timestamp: number;
      transaction_hash: string;
    },
    depositorAddress: string,
    type: 'deposit' | 'withdraw',
  ): LargestTransaction | null => {
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);
    if (!rpcData) return null;

    const assetAmount = Number(
      formatUnits(BigInt(row.assets), rpcData.assetDecimals),
    );
    const amountUsd = assetAmount * rpcData.assetUsdPrice;
    const vaultInfo = getVaultFromRegistry(row.chain_id, row.vault_address);

    return {
      id: row.id,
      type,
      chainId: row.chain_id,
      vaultAddress: row.vault_address,
      vaultName: vaultInfo?.name ?? 'Unknown Vault',
      depositorAddress,
      amountUsd,
      assetSymbol: rpcData.assetSymbol,
      transactionHash: row.transaction_hash,
      timestamp: row.timestamp,
    };
  };

  const enrichedDeposits = (depositEvents.data ?? [])
    .map((d) => enrichTransaction(d, d.receiver, 'deposit'))
    .filter((d): d is LargestTransaction => d !== null);

  const enrichedWithdrawals = (withdrawEvents.data ?? [])
    .map((w) => enrichTransaction(w, w.owner, 'withdraw'))
    .filter((w): w is LargestTransaction => w !== null);

  const largestDeposits = enrichedDeposits
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 10);

  const largestWithdrawals = enrichedWithdrawals
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 10);

  // --- 3. Top Depositors by Current Balance ---
  const depositorMap = new Map<
    string,
    { totalBalanceUsd: number; vaultCount: number }
  >();

  for (const row of depositorRows.data ?? []) {
    const depositorAddr = (row.depositor_address as string).toLowerCase();
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);

    let usdValue = 0;
    if (rpcData && rpcData.assetDecimals && rpcData.assetUsdPrice) {
      const shareAmount = shareBalanceToDecimal(
        String(row.share_balance),
        rpcData.assetDecimals,
      );
      usdValue = shareAmount * rpcData.sharePrice * rpcData.assetUsdPrice;
    }

    const existing = depositorMap.get(depositorAddr);
    if (existing) {
      existing.totalBalanceUsd += usdValue;
      if (usdValue >= MIN_USD_FOR_VAULT_COUNT) existing.vaultCount += 1;
    } else {
      depositorMap.set(depositorAddr, {
        totalBalanceUsd: usdValue,
        vaultCount: usdValue >= MIN_USD_FOR_VAULT_COUNT ? 1 : 0,
      });
    }
  }

  const topDepositors = Array.from(depositorMap.entries())
    .map(([address, data]) => ({ address, ...data }))
    .sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd)
    .slice(0, 10);

  return {
    topVaults,
    bottomVaults,
    largestDeposits,
    largestWithdrawals,
    topDepositors,
  };
}
