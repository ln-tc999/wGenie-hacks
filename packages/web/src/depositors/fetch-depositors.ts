import { z } from 'zod';
import { formatUnits, type Address } from 'viem';
import { addressSchema } from '@/lib/schema';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { APP_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { getCacheKey } from '@/lib/rpc/cache';

// --- Schemas ---

const depositorItemSchema = z.object({
  address: addressSchema,
  totalBalanceUsd: z.number(),
  vaultCount: z.number(),
  lastActivity: z.number(),
});

export type DepositorItem = z.infer<typeof depositorItemSchema>;

const depositorsResponseSchema = z.object({
  depositors: z.array(depositorItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type DepositorsResponse = z.infer<typeof depositorsResponseSchema>;

// --- Search params ---

export interface DepositorSearchParams {
  sort?: string; // 'balance' | 'vaults' | 'activity'
  page?: string;
  depositor?: string; // address search
}

// --- Helpers ---

/**
 * Safely convert a Supabase text/bigint field to a decimal number.
 * Handles the case where Supabase returns JS numbers in scientific notation.
 */
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

const PAGE_SIZE = 20;
const MIN_USD_FOR_VAULT_COUNT = 10;

export async function fetchDepositors(
  params: DepositorSearchParams,
): Promise<DepositorsResponse> {
  // 1. Fetch all vault RPC data (cached 10 min)
  const vaultsForRpc = APP_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));
  const rpcDataMap = await fetchAllVaultsRpcData(vaultsForRpc);

  // 2. Query all active depositors from Supabase
  const { data: rows } = await supabase
    .from('depositor')
    .select(
      'depositor_address, vault_address, chain_id, share_balance, last_activity',
    )
    .gt('share_balance', '0');

  if (!rows || rows.length === 0) {
    return depositorsResponseSchema.parse({
      depositors: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNext: false,
        hasPrevious: false,
      },
    });
  }

  // 3. Aggregate by depositor address
  const aggregated = new Map<
    string,
    {
      totalBalanceUsd: number;
      vaultCount: number;
      lastActivity: number;
    }
  >();

  for (const row of rows) {
    const depositorAddr = row.depositor_address.toLowerCase();
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);

    // Convert share balance to USD
    let usdValue = 0;
    if (rpcData && rpcData.assetDecimals && rpcData.assetUsdPrice) {
      const shareAmount = shareBalanceToDecimal(
        String(row.share_balance),
        rpcData.assetDecimals,
      );
      usdValue = shareAmount * rpcData.sharePrice * rpcData.assetUsdPrice;
    }

    const existing = aggregated.get(depositorAddr);
    if (existing) {
      existing.totalBalanceUsd += usdValue;
      if (usdValue >= MIN_USD_FOR_VAULT_COUNT) {
        existing.vaultCount += 1;
      }
      if (row.last_activity > existing.lastActivity) {
        existing.lastActivity = row.last_activity;
      }
    } else {
      aggregated.set(depositorAddr, {
        totalBalanceUsd: usdValue,
        vaultCount: usdValue >= MIN_USD_FOR_VAULT_COUNT ? 1 : 0,
        lastActivity: row.last_activity,
      });
    }
  }

  // 4. Convert to array and apply depositor address filter
  let depositors = Array.from(aggregated.entries()).map(([address, data]) => ({
    address: address as Address,
    ...data,
  }));

  if (params.depositor) {
    const search = params.depositor.trim().toLowerCase();
    depositors = depositors.filter((d) => d.address.includes(search));
  }

  // 5. Sort
  const sort = params.sort || 'balance';
  switch (sort) {
    case 'vaults':
      depositors.sort(
        (a, b) =>
          b.vaultCount - a.vaultCount ||
          b.totalBalanceUsd - a.totalBalanceUsd,
      );
      break;
    case 'activity':
      depositors.sort((a, b) => b.lastActivity - a.lastActivity);
      break;
    case 'balance':
    default:
      depositors.sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd);
      break;
  }

  // 6. Paginate
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const totalCount = depositors.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;
  const paged = depositors.slice(offset, offset + PAGE_SIZE);

  return depositorsResponseSchema.parse({
    depositors: paged,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  });
}
