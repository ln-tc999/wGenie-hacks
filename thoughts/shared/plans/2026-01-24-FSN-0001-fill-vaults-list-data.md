# Fill Vaults List with Data - Implementation Plan

## Overview

Implement a fully enriched vaults list API that replaces hardcoded dummy data with real on-chain and indexed data. The API will return all 57 vaults across 7 chains in a single call, with 10-minute caching for RPC data.

## Current State Analysis

**Problem**: `packages/ponder/src/vaults/vaults-list.ts:3-14` returns hardcoded zeros/placeholders:
- `tvl: 0`
- `underlyingAsset: 'USDC'` (hardcoded for all vaults)
- `depositorCount: 0`
- `netFlow7d: 0`
- `creationDate: '2025-01-01'`
- `sharePrice: 0`

**Missing Chain Support**: Current ponder config only supports 4 chains, but `plasma-vaults.json` has vaults on 7 chains:
- Supported: Ethereum (1), Arbitrum (42161), Base (8453), Unichain (130)
- Missing: Sonic (9745), Avalanche (43114)

## Desired End State

The `/api/vaults` endpoint returns fully enriched vault data:
```typescript
{
  vaults: [
    {
      // From config
      name: "wGenie USDC Prime",
      address: "0x...",
      chainId: 8453,
      protocol: "wGenie Fusion",
      tags: ["Lending Optimizer"],
      url: "https://...",

      // From RPC (cached 10 min)
      tvl: 1234567.89,              // USD value
      underlyingAsset: "USDC",       // ERC20 symbol
      underlyingAssetAddress: "0x...",
      sharePrice: 1.0234,            // Normalized to 1.0 base

      // From Ponder DB
      depositorCount: 42,            // Active depositors
      netFlow7d: 50000.00,           // Deposits - withdrawals (7d)
      creationDate: "2024-09-15",    // First deposit date
    },
    // ... more vaults
  ],
  pagination: { ... }
}
```

### Verification:
- All vaults across all chains load on http://localhost:3000/vaults
- TVL values match what's shown on https://app.wGenie.io/fusion
- Depositor counts are accurate (can verify via individual vault metrics endpoint)
- Net flow shows positive/negative values correctly

## What We're NOT Doing

- Not adding USD price feeds for non-stablecoin vaults (TVL will be in underlying asset terms initially)
- Not implementing real-time websocket updates (10-min cache is sufficient)
- Not modifying the frontend vault-card component (API contract matches existing schema)
- Not adding pagination logic server-side (return all vaults, frontend handles display)

## Implementation Approach

1. Add missing chain support (Sonic, Avalanche)
2. Create a cache service for RPC data with 10-minute TTL
3. Create vault enrichment service that combines:
   - Static config data (from plasma-vaults.json)
   - RPC data (TVL, sharePrice, underlyingAsset) - cached
   - DB data (depositorCount, netFlow7d, creationDate) - real-time
4. Update vaults-list API to use enriched data

---

## Phase 1: Add Missing Chain Support

### Overview
Add Sonic and Avalanche chains to ponder configuration to support all vaults.

### Changes Required:

#### 1. Update chains utility
**File**: `packages/ponder/src/utils/chains.ts`
**Changes**: Add Sonic and Avalanche chain definitions

```typescript
import { arbitrum, base, mainnet, unichain, avalanche } from 'viem/chains';
import { z } from 'zod';

// Define Sonic chain (not in viem yet)
export const sonic = {
  id: 9745,
  name: 'Sonic',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.soniclabs.com'] },
  },
} as const;

export const chains = [mainnet, arbitrum, base, unichain, avalanche, sonic] as const;

export const chainIdSchema = z.union([
  z.literal(mainnet.id),
  z.literal(arbitrum.id),
  z.literal(base.id),
  z.literal(unichain.id),
  z.literal(avalanche.id),
  z.literal(sonic.id),
]);

export type ChainId = z.infer<typeof chainIdSchema>;
```

#### 2. Update RPC clients
**File**: `packages/ponder/src/utils/clients.ts`
**Changes**: Add RPC URLs for new chains

```typescript
import { avalanche } from 'viem/chains';
import { sonic } from './chains';

const RPC_URL: Record<ChainId, string> = {
  [mainnet.id]: process.env.PONDER_RPC_URL_MAINNET!,
  [arbitrum.id]: process.env.PONDER_RPC_URL_ARBITRUM!,
  [base.id]: process.env.PONDER_RPC_URL_BASE!,
  [unichain.id]: process.env.PONDER_RPC_URL_UNICHAIN!,
  [avalanche.id]: process.env.PONDER_RPC_URL_AVALANCHE!,
  [sonic.id]: process.env.PONDER_RPC_URL_SONIC!,
};
```

#### 3. Update ponder config
**File**: `packages/ponder/ponder.config.ts`
**Changes**: Add Avalanche and Sonic chain indexing

```typescript
import { avalanche } from 'viem/chains';
import { sonic } from './src/utils/chains';

// In chains config:
avalanche: {
  id: avalanche.id,
  rpc: process.env.PONDER_RPC_URL_AVALANCHE,
},
sonic: {
  id: sonic.id,
  rpc: process.env.PONDER_RPC_URL_SONIC,
},

// In contracts.ERC4626.chain:
avalanche: {
  address: getChainVaults(avalanche.id).map((vault) => vault.address),
  startBlock: getChainStartBlock(avalanche.id),
},
sonic: {
  address: getChainVaults(sonic.id).map((vault) => vault.address),
  startBlock: getChainStartBlock(sonic.id),
},
```

#### 4. Add environment variables
**File**: `.env.example` (or document in README)
**Changes**: Add new RPC URL placeholders

```
PONDER_RPC_URL_AVALANCHE=https://api.avax.network/ext/bc/C/rpc
PONDER_RPC_URL_SONIC=https://rpc.soniclabs.com
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd packages/ponder && pnpm typecheck`
- [ ] Ponder starts without errors: `cd packages/ponder && pnpm dev`

#### Manual Verification:
- [ ] Check ponder logs show indexing for all 7 chains
- [ ] Verify no RPC errors for Sonic/Avalanche vaults

---

## Phase 2: Create Cache Service

### Overview
Implement a simple in-memory cache with 10-minute TTL for RPC data.

### Changes Required:

#### 1. Create cache utility
**File**: `packages/ponder/src/utils/cache.ts` (new file)
**Changes**: Create TTL cache implementation

```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const TEN_MINUTES_MS = 10 * 60 * 1000;

export const getFromCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setInCache = <T>(key: string, data: T, ttlMs = TEN_MINUTES_MS): void => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const clearCache = (): void => {
  cache.clear();
};

export const getCacheKey = (chainId: number, vaultAddress: string): string => {
  return `vault:${chainId}:${vaultAddress.toLowerCase()}`;
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/ponder && pnpm typecheck`

#### Manual Verification:
- [ ] N/A (will be tested in Phase 4)

---

## Phase 3: Create Vault Enrichment Service

### Overview
Create a service that fetches and combines all vault data sources.

### Changes Required:

#### 1. Create vault data fetcher for RPC data
**File**: `packages/ponder/src/api/vaults/vault-rpc-data.ts` (new file)
**Changes**: Implement RPC data fetching with multicall

```typescript
import { Address, erc20Abi, formatUnits } from 'viem';
import { getPublicClient } from '../../utils/clients';
import { ChainId } from '../../utils/chains';
import { erc4626ABI } from '../../../abis/erc4626ABI';
import { getFromCache, setInCache, getCacheKey } from '../../utils/cache';

export interface VaultRpcData {
  totalAssets: bigint;
  totalSupply: bigint;
  assetAddress: Address;
  assetSymbol: string;
  assetDecimals: number;
  sharePrice: number; // Normalized (e.g., 1.0234)
}

export const fetchVaultRpcData = async (
  chainId: ChainId,
  vaultAddress: Address,
): Promise<VaultRpcData> => {
  const cacheKey = getCacheKey(chainId, vaultAddress);
  const cached = getFromCache<VaultRpcData>(cacheKey);
  if (cached) return cached;

  const client = getPublicClient(chainId);

  // First multicall: get vault data
  const [totalAssetsResult, totalSupplyResult, assetResult] = await client.multicall({
    contracts: [
      { address: vaultAddress, abi: erc4626ABI, functionName: 'totalAssets' },
      { address: vaultAddress, abi: erc4626ABI, functionName: 'totalSupply' },
      { address: vaultAddress, abi: erc4626ABI, functionName: 'asset' },
    ],
  });

  const totalAssets = totalAssetsResult.result ?? 0n;
  const totalSupply = totalSupplyResult.result ?? 0n;
  const assetAddress = assetResult.result as Address;

  // Second multicall: get asset info
  const [symbolResult, decimalsResult] = await client.multicall({
    contracts: [
      { address: assetAddress, abi: erc20Abi, functionName: 'symbol' },
      { address: assetAddress, abi: erc20Abi, functionName: 'decimals' },
    ],
  });

  const assetSymbol = symbolResult.result ?? 'UNKNOWN';
  const assetDecimals = decimalsResult.result ?? 18;

  // Calculate share price: totalAssets / totalSupply (normalized)
  let sharePrice = 1.0;
  if (totalSupply > 0n) {
    sharePrice = Number(formatUnits(totalAssets, assetDecimals)) /
                 Number(formatUnits(totalSupply, assetDecimals));
  }

  const data: VaultRpcData = {
    totalAssets,
    totalSupply,
    assetAddress,
    assetSymbol,
    assetDecimals,
    sharePrice,
  };

  setInCache(cacheKey, data);
  return data;
};

// Batch fetch for all vaults on a chain
export const fetchAllVaultsRpcData = async (
  vaults: Array<{ chainId: ChainId; address: Address }>,
): Promise<Map<string, VaultRpcData>> => {
  const results = new Map<string, VaultRpcData>();

  // Group by chain for efficient multicalls
  const byChain = new Map<ChainId, Address[]>();
  for (const vault of vaults) {
    const list = byChain.get(vault.chainId) || [];
    list.push(vault.address);
    byChain.set(vault.chainId, list);
  }

  // Fetch each chain in parallel
  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, addresses]) => {
      await Promise.all(
        addresses.map(async (address) => {
          try {
            const data = await fetchVaultRpcData(chainId, address);
            results.set(getCacheKey(chainId, address), data);
          } catch (error) {
            console.error(`Failed to fetch RPC data for ${chainId}:${address}`, error);
            // Set default values on error
            results.set(getCacheKey(chainId, address), {
              totalAssets: 0n,
              totalSupply: 0n,
              assetAddress: '0x0000000000000000000000000000000000000000',
              assetSymbol: 'UNKNOWN',
              assetDecimals: 18,
              sharePrice: 0,
            });
          }
        }),
      );
    }),
  );

  return results;
};
```

#### 2. Create vault DB data fetcher
**File**: `packages/ponder/src/api/vaults/vault-db-data.ts` (new file)
**Changes**: Implement DB queries for depositorCount, netFlow7d, creationDate

```typescript
import { db } from 'ponder:api';
import { and, eq, gte, gt, sql } from 'ponder';
import schema from 'ponder:schema';
import { Address } from 'viem';
import { getUnixTime } from 'date-fns';
import { BUCKET_SIZE, getBucketId, getDepositBucketSchema, getWithdrawBucketSchema } from '../../utils/buckets';

export interface VaultDbData {
  depositorCount: number;
  netFlow7d: bigint;
  firstDepositTimestamp: number | null;
}

export const fetchVaultDbData = async (
  chainId: number,
  vaultAddress: Address,
): Promise<VaultDbData> => {
  const normalizedAddress = vaultAddress.toLowerCase() as Address;

  // Query 1: Active depositor count
  const depositorResult = await db
    .select({
      count: sql<number>`count(distinct ${schema.depositor.depositorAddress})`,
    })
    .from(schema.depositor)
    .where(
      and(
        eq(schema.depositor.chainId, chainId),
        eq(schema.depositor.vaultAddress, normalizedAddress),
        gt(schema.depositor.shareBalance, 0n),
      ),
    );

  // Query 2: First deposit timestamp
  const firstDepositResult = await db
    .select({
      firstDeposit: sql<number>`min(${schema.depositEvent.timestamp})`,
    })
    .from(schema.depositEvent)
    .where(
      and(
        eq(schema.depositEvent.chainId, chainId),
        eq(schema.depositEvent.vaultAddress, normalizedAddress),
      ),
    );

  // Query 3: 7-day net flow
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, '2_HOURS');
  const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS']; // 84 buckets = 7 days

  const depositBucketSchema = getDepositBucketSchema('2_HOURS');
  const withdrawBucketSchema = getWithdrawBucketSchema('2_HOURS');

  const [depositSum, withdrawSum] = await Promise.all([
    db
      .select({
        total: sql<bigint>`coalesce(sum(${depositBucketSchema.sum}), 0)`,
      })
      .from(depositBucketSchema)
      .where(
        and(
          eq(depositBucketSchema.chainId, chainId),
          eq(depositBucketSchema.vaultAddress, normalizedAddress),
          gte(depositBucketSchema.bucketId, startBucketId),
        ),
      ),
    db
      .select({
        total: sql<bigint>`coalesce(sum(${withdrawBucketSchema.sum}), 0)`,
      })
      .from(withdrawBucketSchema)
      .where(
        and(
          eq(withdrawBucketSchema.chainId, chainId),
          eq(withdrawBucketSchema.vaultAddress, normalizedAddress),
          gte(withdrawBucketSchema.bucketId, startBucketId),
        ),
      ),
  ]);

  const netFlow7d = (depositSum[0]?.total ?? 0n) - (withdrawSum[0]?.total ?? 0n);

  return {
    depositorCount: depositorResult[0]?.count ?? 0,
    netFlow7d,
    firstDepositTimestamp: firstDepositResult[0]?.firstDeposit ?? null,
  };
};

// Batch fetch for all vaults
export const fetchAllVaultsDbData = async (
  vaults: Array<{ chainId: number; address: Address }>,
): Promise<Map<string, VaultDbData>> => {
  const results = new Map<string, VaultDbData>();

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < vaults.length; i += BATCH_SIZE) {
    const batch = vaults.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (vault) => {
        try {
          const data = await fetchVaultDbData(vault.chainId, vault.address);
          results.set(`${vault.chainId}:${vault.address.toLowerCase()}`, data);
        } catch (error) {
          console.error(`Failed to fetch DB data for ${vault.chainId}:${vault.address}`, error);
          results.set(`${vault.chainId}:${vault.address.toLowerCase()}`, {
            depositorCount: 0,
            netFlow7d: 0n,
            firstDepositTimestamp: null,
          });
        }
      }),
    );
  }

  return results;
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/ponder && pnpm typecheck`

#### Manual Verification:
- [ ] N/A (will be tested in Phase 4)

---

## Phase 4: Update Vaults List API

### Overview
Modify the vaults-list endpoint to return enriched data.

### Changes Required:

#### 1. Update vaults-list API
**File**: `packages/ponder/src/api/vaults/vaults-list.ts`
**Changes**: Complete rewrite to use enrichment services

```typescript
import { Hono } from 'hono';
import { ERC4626_VAULTS } from '../../contracts';
import { fetchAllVaultsRpcData } from './vault-rpc-data';
import { fetchAllVaultsDbData } from './vault-db-data';
import { getCacheKey } from '../../utils/cache';
import { formatUnits } from 'viem';
import { ChainId } from '../../utils/chains';

export const vaultsList = new Hono();

vaultsList.get('/', async (c) => {
  const vaults = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId as ChainId,
    address: v.address,
  }));

  // Fetch data in parallel
  const [rpcDataMap, dbDataMap] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllVaultsDbData(vaults),
  ]);

  // Combine all data sources
  const enrichedVaults = ERC4626_VAULTS.map((vault) => {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const dbKey = `${vault.chainId}:${vault.address.toLowerCase()}`;

    const rpcData = rpcDataMap.get(rpcKey);
    const dbData = dbDataMap.get(dbKey);

    // Calculate TVL in underlying asset terms
    const tvl = rpcData
      ? Number(formatUnits(rpcData.totalAssets, rpcData.assetDecimals))
      : 0;

    // Calculate net flow in underlying asset terms
    const netFlow7d = dbData && rpcData
      ? Number(formatUnits(dbData.netFlow7d, rpcData.assetDecimals))
      : 0;

    // Format creation date
    const creationDate = dbData?.firstDepositTimestamp
      ? new Date(dbData.firstDepositTimestamp * 1000).toISOString().split('T')[0]
      : new Date(0).toISOString().split('T')[0]; // Fallback to epoch

    return {
      chainId: vault.chainId,
      address: vault.address,
      name: vault.name,
      protocol: vault.protocol,
      tags: vault.tags,
      url: vault.url,
      tvl,
      underlyingAsset: rpcData?.assetSymbol ?? 'UNKNOWN',
      underlyingAssetAddress: rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000',
      depositorCount: dbData?.depositorCount ?? 0,
      netFlow7d,
      creationDate,
      sharePrice: rpcData?.sharePrice ?? 0,
    };
  });

  return c.json({
    vaults: enrichedVaults,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: enrichedVaults.length,
      hasNext: false,
      hasPrevious: false,
    },
  });
});
```

#### 2. Delete old vaults-list helper
**File**: `packages/ponder/src/vaults/vaults-list.ts`
**Changes**: Delete this file (no longer needed)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/ponder && pnpm typecheck`
- [ ] Ponder starts: `cd packages/ponder && pnpm dev`
- [ ] API returns valid JSON: `curl http://localhost:42069/api/vaults | jq .`
- [ ] Response schema matches frontend expectations

#### Manual Verification:
- [ ] Visit http://localhost:3000/vaults - all vaults display with real data
- [ ] TVL values are non-zero for active vaults
- [ ] Underlying asset symbols are correct (USDC, WETH, wstETH, etc.)
- [ ] Depositor counts show actual numbers
- [ ] Net flow shows positive (green) or negative (red) values appropriately
- [ ] Share prices show ~1.0+ for healthy vaults

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Phase 5: Handle Edge Cases & Error States

### Overview
Add graceful handling for RPC failures, missing data, and chain-specific issues.

### Changes Required:

#### 1. Add retry logic to RPC fetcher
**File**: `packages/ponder/src/api/vaults/vault-rpc-data.ts`
**Changes**: Add retry with exponential backoff

```typescript
const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
};
```

#### 2. Add request timeout
**File**: `packages/ponder/src/utils/clients.ts`
**Changes**: Configure timeout on public clients

```typescript
export const getPublicClient = (chainId: ChainId) => {
  const chain = extractChain({ chains, id: chainId });
  return createPublicClient({
    chain,
    transport: http(RPC_URL[chainId], {
      timeout: 10_000, // 10 second timeout
    }),
  });
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/ponder && pnpm typecheck`

#### Manual Verification:
- [ ] API responds gracefully when one chain's RPC is down
- [ ] Vaults with failed RPC calls show 0 values (not errors)

---

## Testing Strategy

### Unit Tests:
- Cache utility: test TTL expiration, get/set operations
- Bucket calculation: verify 7-day bucket range calculation

### Integration Tests:
- Mock RPC responses and verify vault enrichment
- Test DB queries against test database with sample data

### Manual Testing Steps:
1. Start ponder: `cd packages/ponder && pnpm dev`
2. Wait for indexing to catch up (check logs)
3. Visit http://localhost:3000/vaults
4. Verify each vault card shows:
   - Non-zero TVL (for active vaults)
   - Correct underlying asset symbol
   - Accurate depositor count
   - Net flow with +/- indicator
   - Reasonable share price (~1.0+)
5. Compare TVL values with https://app.wGenie.io/fusion for validation

## Performance Considerations

- **Caching**: 10-minute TTL prevents excessive RPC calls
- **Parallel fetching**: RPC and DB queries run concurrently
- **Batch by chain**: Reduces connection overhead
- **Multicall**: Batches multiple contract reads into single RPC call
- **Concurrency limit**: DB queries limited to 10 concurrent to avoid connection exhaustion

## Migration Notes

- No database migrations required
- Existing ponder indexing continues to work
- Frontend requires no changes (API contract matches existing schema)
- Rollback: revert to previous vaults-list.ts if issues arise

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0001.md`
- Vault card component: `packages/web/src/vault-directory/components/vault-card.tsx`
- Existing metrics API: `packages/ponder/src/api/vaults/metrics.ts`
- Flow chart query pattern: `packages/ponder/src/api/vaults/flow-chart.ts`
- PlasmaVault SDK: `packages/sdk/src/PlasmaVault.ts`
