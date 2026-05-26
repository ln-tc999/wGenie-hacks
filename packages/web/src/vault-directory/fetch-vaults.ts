import { z } from 'zod';
import { formatUnits, type Address } from 'viem';
import { addressSchema } from '@/lib/schema';
import { chainIdSchema } from '@/app/chains.config';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { APP_VAULTS, getChainName } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { getCacheKey } from '@/lib/rpc/cache';
import { BUCKET_SIZE, getBucketId } from '@/lib/buckets';
import { getUnixTime } from 'date-fns';

// Vault data schema
const vaultDataSchema = z.object({
  chainId: chainIdSchema,
  address: addressSchema,
  name: z.string(),
  protocol: z.string(),
  tvlUsd: z.number(),
  tvlAsset: z.number(),
  underlyingAsset: z.string(),
  underlyingAssetAddress: addressSchema,
  depositorCount: z.number(),
  netFlow7d: z.number(),
  netFlow7dAsset: z.number(),
  creationDate: z.string().transform((str) => new Date(str)),
  sharePrice: z.number(),
});

export type VaultData = z.infer<typeof vaultDataSchema>;

const vaultsResponseSchema = z.object({
  vaults: z.array(vaultDataSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type VaultsResponse = z.infer<typeof vaultsResponseSchema>;

// Metadata schema
const chainSchema = z.object({
  chainId: z.number(),
  name: z.string(),
});

const assetSchema = z.object({
  symbol: z.string(),
  chainId: z.number(),
  address: addressSchema,
});

const vaultsMetadataSchema = z.object({
  ranges: z.object({
    tvl: z.object({ min: z.number(), max: z.number() }),
    depositors: z.object({ min: z.number(), max: z.number() }),
  }),
  chains: z.array(chainSchema),
  protocols: z.array(z.string()),
  assets: z.array(assetSchema),
  totalVaults: z.number(),
});

export type VaultsMetadata = z.infer<typeof vaultsMetadataSchema>;

export interface VaultSearchParams {
  page?: string;
  sort?: string;
  tvl_min?: string;
  tvl_max?: string;
  depositors_min?: string;
  depositors_max?: string;
  net_flow?: string;
  underlying_assets?: string;
  chains?: string;
  protocols?: string;
}

// --- DB data fetching ---

interface VaultDbData {
  depositorCount: number;
  netFlow7d: bigint;
  firstDepositTimestamp: number | null;
}

const DEFAULT_DB_DATA: VaultDbData = {
  depositorCount: 0,
  netFlow7d: 0n,
  firstDepositTimestamp: null,
};

async function fetchVaultDbData(
  chainId: number,
  vaultAddress: string,
): Promise<VaultDbData> {
  const normalizedAddress = vaultAddress.toLowerCase();

  try {
    // Active depositor count
    const { count: depositorCount } = await supabase
      .from('depositor')
      .select('*', { count: 'exact', head: true })
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .gt('share_balance', '0');

    // First deposit timestamp
    const { data: firstDepositData } = await supabase
      .from('deposit_event')
      .select('timestamp')
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .order('timestamp', { ascending: true })
      .limit(1);

    // 7-day net flow from buckets
    const now = getUnixTime(new Date());
    const endBucketId = getBucketId(now, '2_HOURS');
    const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS'];

    const [depositResult, withdrawResult] = await Promise.all([
      supabase
        .from('deposit_buckets_2_hours')
        .select('sum')
        .eq('chain_id', chainId)
        .eq('vault_address', normalizedAddress)
        .gte('bucket_id', startBucketId),
      supabase
        .from('withdraw_buckets_2_hours')
        .select('sum')
        .eq('chain_id', chainId)
        .eq('vault_address', normalizedAddress)
        .gte('bucket_id', startBucketId),
    ]);

    const depositTotal = depositResult.data?.reduce((acc, r) => acc + BigInt(r.sum), 0n) ?? 0n;
    const withdrawTotal = withdrawResult.data?.reduce((acc, r) => acc + BigInt(r.sum), 0n) ?? 0n;

    return {
      depositorCount: depositorCount ?? 0,
      netFlow7d: depositTotal - withdrawTotal,
      firstDepositTimestamp: firstDepositData?.[0]?.timestamp ?? null,
    };
  } catch (error) {
    console.error(`Failed to fetch DB data for ${chainId}:${vaultAddress}`, error);
    return DEFAULT_DB_DATA;
  }
}

async function fetchAllVaultsDbData(
  vaults: Array<{ chainId: number; address: string }>,
): Promise<Map<string, VaultDbData>> {
  const results = new Map<string, VaultDbData>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < vaults.length; i += BATCH_SIZE) {
    const batch = vaults.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (vault) => {
        const data = await fetchVaultDbData(vault.chainId, vault.address);
        results.set(`${vault.chainId}:${vault.address.toLowerCase()}`, data);
      }),
    );
  }

  return results;
}

// --- Main fetch functions ---

export async function fetchVaults(
  searchParams: VaultSearchParams
): Promise<VaultsResponse> {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const sort = (searchParams.sort || 'tvl') as 'tvl' | 'depositors' | 'age';

  const vaults = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address,
  }));

  const [rpcDataMap, dbDataMap] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllVaultsDbData(vaults),
  ]);

  // Combine data sources
  let enrichedVaults = APP_VAULTS.map((vault) => {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const dbKey = `${vault.chainId}:${vault.address.toLowerCase()}`;
    const rpcData = rpcDataMap.get(rpcKey);
    const dbData = dbDataMap.get(dbKey);

    const tvlAsset =
      rpcData && rpcData.assetDecimals
        ? Number(formatUnits(rpcData.totalAssets, rpcData.assetDecimals))
        : 0;

    const tvlUsd = rpcData?.tvlUsd ?? 0;

    let netFlow7dAsset = 0;
    let netFlow7d = 0;
    if (dbData && rpcData && rpcData.assetDecimals && dbData.netFlow7d !== null) {
      const formatted = Number(formatUnits(dbData.netFlow7d, rpcData.assetDecimals));
      netFlow7dAsset = Number.isNaN(formatted) ? 0 : formatted;
      netFlow7d = netFlow7dAsset * (rpcData.assetUsdPrice || 0);
    }

    const creationDate = dbData?.firstDepositTimestamp
      ? new Date(dbData.firstDepositTimestamp * 1000).toISOString().split('T')[0]
      : '1970-01-01';

    return {
      chainId: vault.chainId,
      address: vault.address as Address,
      name: vault.name,
      protocol: vault.protocol,
      tvlUsd,
      tvlAsset,
      underlyingAsset: rpcData?.assetSymbol ?? 'UNKNOWN',
      underlyingAssetAddress: rpcData?.assetAddress ?? ('0x0000000000000000000000000000000000000000' as Address),
      depositorCount: dbData?.depositorCount ?? 0,
      netFlow7d,
      netFlow7dAsset,
      creationDate,
      sharePrice: rpcData?.sharePrice ?? 0,
    };
  });

  // Apply filters
  if (searchParams.tvl_min) {
    const min = Number(searchParams.tvl_min);
    enrichedVaults = enrichedVaults.filter((v) => v.tvlUsd >= min);
  }
  if (searchParams.tvl_max) {
    const max = Number(searchParams.tvl_max);
    enrichedVaults = enrichedVaults.filter((v) => v.tvlUsd <= max);
  }
  if (searchParams.depositors_min) {
    const min = Number(searchParams.depositors_min);
    enrichedVaults = enrichedVaults.filter((v) => v.depositorCount >= min);
  }
  if (searchParams.depositors_max) {
    const max = Number(searchParams.depositors_max);
    enrichedVaults = enrichedVaults.filter((v) => v.depositorCount <= max);
  }
  if (searchParams.net_flow === 'positive') {
    enrichedVaults = enrichedVaults.filter((v) => v.netFlow7d > 0);
  } else if (searchParams.net_flow === 'negative') {
    enrichedVaults = enrichedVaults.filter((v) => v.netFlow7d < 0);
  }
  if (searchParams.underlying_assets) {
    const assets = searchParams.underlying_assets.split(',').map((a) => a.trim().toUpperCase());
    enrichedVaults = enrichedVaults.filter((v) => assets.includes(v.underlyingAsset.toUpperCase()));
  }
  if (searchParams.chains) {
    const chainIds = searchParams.chains.split(',').map((c) => parseInt(c.trim(), 10));
    enrichedVaults = enrichedVaults.filter((v) => chainIds.includes(v.chainId));
  }
  if (searchParams.protocols) {
    const protocols = searchParams.protocols.split(',').map((p) => p.trim().toLowerCase());
    enrichedVaults = enrichedVaults.filter((v) => protocols.includes(v.protocol.toLowerCase()));
  }

  // Sort
  enrichedVaults.sort((a, b) => {
    switch (sort) {
      case 'tvl':
        return b.tvlUsd - a.tvlUsd;
      case 'depositors':
        return b.depositorCount - a.depositorCount;
      case 'age':
        return new Date(b.creationDate || '1970-01-01').getTime() - new Date(a.creationDate || '1970-01-01').getTime();
      default:
        return 0;
    }
  });

  // Paginate
  const totalCount = enrichedVaults.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const paginatedVaults = enrichedVaults.slice(startIndex, startIndex + limit);

  return vaultsResponseSchema.parse({
    vaults: paginatedVaults,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  });
}

export async function fetchVaultsMetadata(): Promise<VaultsMetadata> {
  const vaults = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address,
  }));

  const [rpcDataMap, dbDataMap] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllVaultsDbData(vaults),
  ]);

  let maxTvl = 0;
  let maxDepositors = 0;
  const chainsSet = new Set<number>();
  const protocolsSet = new Set<string>();
  const assetsMap = new Map<string, { symbol: string; chainId: number; address: string }>();

  for (const vault of APP_VAULTS) {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const dbKey = `${vault.chainId}:${vault.address.toLowerCase()}`;
    const rpcData = rpcDataMap.get(rpcKey);
    const dbData = dbDataMap.get(dbKey);

    const tvlUsd = rpcData?.tvlUsd ?? 0;
    if (tvlUsd > maxTvl) maxTvl = tvlUsd;

    const depositorCount = dbData?.depositorCount ?? 0;
    if (depositorCount > maxDepositors) maxDepositors = depositorCount;

    chainsSet.add(vault.chainId);
    protocolsSet.add(vault.protocol);

    if (rpcData?.assetSymbol && rpcData.assetSymbol !== 'UNKNOWN') {
      const existing = assetsMap.get(rpcData.assetSymbol);
      if (!existing || vault.chainId < existing.chainId) {
        assetsMap.set(rpcData.assetSymbol, {
          symbol: rpcData.assetSymbol,
          chainId: vault.chainId,
          address: rpcData.assetAddress,
        });
      }
    }
  }

  const chains = Array.from(chainsSet)
    .sort((a, b) => a - b)
    .map((chainId) => ({ chainId, name: getChainName(chainId) }));

  const protocols = Array.from(protocolsSet).sort();
  const assets = Array.from(assetsMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return vaultsMetadataSchema.parse({
    ranges: {
      tvl: { min: 0, max: Math.ceil(maxTvl) },
      depositors: { min: 0, max: maxDepositors },
    },
    chains,
    protocols,
    assets,
    totalVaults: APP_VAULTS.length,
  });
}
