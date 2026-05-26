# wGenie Monorepo Data Fetching Patterns

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Server-Side RPC Enrichment](#server-side-rpc-enrichment)
- [Supabase Data Layer](#supabase-data-layer)
- [Client-Side Wagmi Hooks](#client-side-wagmi-hooks)
- [Data Flow: Vaults List Page](#data-flow-vaults-list-page)
- [Data Flow: Vault Detail Page](#data-flow-vault-detail-page)
- [Key Files](#key-files)

## Architecture Overview

The wGenie monorepo uses a **hybrid server-side + client-side** architecture:

```
Data Sources:
  ┌──────────────────────┐  ┌───────────────────┐  ┌──────────────────┐
  │  plasma-vaults.json  │  │  Blockchain (RPC)  │  │    Supabase      │
  │  (vault registry)    │  │  (viem multicall)  │  │  (indexed events)│
  └──────────┬───────────┘  └─────────┬─────────┘  └────────┬─────────┘
             │                        │                      │
             └────────────┬───────────┴──────────────────────┘
                          │
                  Server Functions (Next.js)
                  fetchVaults(), fetchActivity()
                          │
                  ┌───────┴────────┐
                  │                │
          Server Components    API Routes
          (SSR props)          (/api/*)
                  │                │
                  └───────┬────────┘
                          │
                   React Query Cache
                   (client-side, 5min default)
                          │
                   UI Components
```

Three data sources merged server-side:
1. **Static vault registry** — `plasma-vaults.json` at monorepo root, parsed by `packages/web/src/lib/vaults-registry.ts`
2. **Blockchain RPC** — viem multicall in `packages/web/src/lib/rpc/`, server-side with 10min in-memory cache
3. **Supabase** — indexed blockchain events via `@wgenie/fusion-supabase-ponder` package

## Server-Side RPC Enrichment

Located in `packages/web/src/lib/rpc/`. Uses viem (not wagmi) for server-side contract reads.

### Client Factory (`clients.ts`)

Singleton viem `PublicClient` per chain, cached in a Map:

```typescript
// packages/web/src/lib/rpc/clients.ts
const clientCache = new Map<number, PublicClient>();

export const getPublicClient = (chainId: number): PublicClient => {
  const cached = clientCache.get(chainId);
  if (cached) return cached;

  const client = createPublicClient({
    chain: chains.find((c) => c.id === chainId),
    transport: http(RPC_URLS[chainId], { timeout: 10_000 }),
  });

  clientCache.set(chainId, client);
  return client;
};
```

RPC URLs: Server-side `RPC_URL_MAINNET` with fallback to `NEXT_PUBLIC_RPC_URL_MAINNET`.

### Vault Data Fetcher (`vault-rpc-data.ts`)

Multi-phase multicall with retry and in-memory cache:

```typescript
// packages/web/src/lib/rpc/vault-rpc-data.ts
export const fetchVaultRpcData = async (chainId: number, vaultAddress: Address): Promise<VaultRpcData> => {
  // Check 10-minute cache first
  const cached = getFromCache<VaultRpcData>(cacheKey);
  if (cached) return cached;

  // Phase 1: Vault multicall (totalAssets, totalSupply, asset)
  // Phase 2: Asset multicall (symbol, decimals)
  // Phase 3: Price oracle (getPriceOracleMiddleware → getAssetPrice)
  // Compute: sharePrice = totalAssets / totalSupply
  // Compute: tvlUsd = totalAssets * assetUsdPrice

  setInCache(cacheKey, data);
  return data;
};
```

Batch fetcher groups vaults by chain for parallel execution:

```typescript
export const fetchAllVaultsRpcData = async (vaults) => {
  // Group by chainId → Promise.all per chain → Promise.all across chains
};
```

### In-Memory Cache (`cache.ts`)

Simple Map with TTL, used server-side only:

```typescript
// packages/web/src/lib/rpc/cache.ts
const cache = new Map<string, CacheEntry<unknown>>();
const TEN_MINUTES_MS = 10 * 60 * 1000;

// Key format: "vault:${chainId}:${address.toLowerCase()}"
```

## Supabase Data Layer

Supabase contains blockchain events indexed by Ponder. Accessed via `@wgenie/fusion-supabase-ponder` package.

### Key Tables

- `deposit_event` / `withdrawal_event` — individual transaction events
- `deposit_buckets_2_hours` / `withdraw_buckets_2_hours` — pre-aggregated time buckets for charts
- `depositor` — current depositor state (share balances)

### Important Patterns

**BigInt handling:** Supabase stores large numbers as `text` columns. Always use `String()` before converting:

```typescript
// Supabase may return text columns as JS numbers if they look numeric
// BigInt("3.51e+22") throws — check typeof first
const value = typeof row.sum === 'number'
  ? BigInt(Math.round(row.sum))
  : BigInt(row.sum);
```

**No native SUM:** Fetch rows and aggregate in JS:

```typescript
const { data: deposits } = await supabase
  .from('deposit_buckets_2_hours')
  .select('sum')
  .gte('bucket', startBucket)
  .eq('vault_address', vaultAddress);

const total = deposits.reduce((acc, row) => acc + BigInt(String(row.sum)), 0n);
```

**Column mapping:** Database uses snake_case, app uses camelCase — map in query handlers.

## Client-Side Wagmi Hooks

For data that must be fresh and user-specific, client-side wagmi hooks are used:

### Batched Contract Reads

```typescript
// packages/web/src/features/vault/hooks/use-vault-data.ts
const result = useReadContracts({
  contracts: [
    { address: vaultAddress, abi: erc20Abi, functionName: 'name', chainId },
    { address: vaultAddress, abi: erc20Abi, functionName: 'symbol', chainId },
    { address: vaultAddress, abi: erc20Abi, functionName: 'decimals', chainId },
    { address: vaultAddress, abi: erc4626Abi, functionName: 'asset', chainId },
  ],
  query: {
    staleTime: Infinity, // immutable metadata
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  },
});
```

### Dependent Queries

```typescript
// Second query depends on first result
const assetDataResult = useReadContracts({
  contracts: assetResult?.result ? [
    { address: assetResult.result, abi: erc20Abi, functionName: 'decimals', chainId },
    { address: assetResult.result, abi: erc20Abi, functionName: 'symbol', chainId },
  ] : [],
  query: {
    enabled: !!assetResult?.result,
    staleTime: Infinity,
  },
});
```

### React Query Configuration

```typescript
// packages/web/src/app/query-client-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes global default
      refetchOnWindowFocus: false,
    },
  },
});
```

## Data Flow: Vaults List Page

```
1. User navigates to /vaults?sort=tvl&chains=1,42161

2. Server Component (app/vaults/page.tsx)
   ├── fetchVaults(searchParams)
   │   ├── Read plasma-vaults.json → vault registry
   │   ├── fetchAllVaultsRpcData() → multicall per chain (cached 10min)
   │   ├── fetchAllVaultsDbData() → Supabase queries (depositors, flows)
   │   ├── Merge: registry + RPC + DB → enrichedVaults[]
   │   ├── Filter: chains, TVL range, depositor count
   │   ├── Sort: by tvlUsd, depositorCount, or creationDate
   │   └── Paginate: 20 per page
   └── Returns { vaults: VaultData[], pagination }

3. Client Component receives pre-enriched data as props
   └── Renders table with formatCurrency() in column cells
```

No client-side data fetching needed — everything resolved server-side.

## Data Flow: Vault Detail Page

```
1. User navigates to /vaults/[chainId]/[address]

2. Server Component loads vault metadata from registry

3. Client Components fetch additional data:
   ├── useVaultData() → wagmi useReadContracts (immutable metadata)
   ├── useVaultMetricsQuery() → React Query → /api/vaults/[chainId]/[address]/metrics
   │   └── API route fetches from Supabase (depositors, share balances)
   ├── useReadContract(convertToAssets) → wagmi (depends on totalShareBalance)
   └── useFlowChartQuery() → React Query → /api/vaults/[chainId]/[address]/flow-chart
       └── API route fetches from bucket tables + RPC enrichment
```

This is where the Fetch → Mapper → Hook pattern could most improve the codebase — the vault detail page has multiple dependent client-side queries with `enabled` chains.

## Key Files

### Server-Side RPC
- `packages/web/src/lib/rpc/clients.ts` — viem client factory
- `packages/web/src/lib/rpc/vault-rpc-data.ts` — vault blockchain data fetcher
- `packages/web/src/lib/rpc/cache.ts` — in-memory TTL cache
- `packages/web/src/lib/rpc/asset-prices.ts` — price oracle fetcher

### Vault Registry
- `plasma-vaults.json` — single source of truth for vault list
- `packages/web/src/lib/vaults-registry.ts` — parser

### Data Fetching (Server Functions)
- `packages/web/src/features/vault-directory/fetch-vaults.ts` — vaults list data
- `packages/web/src/features/activity/fetch-activity.ts` — activity feed

### Client-Side Hooks
- `packages/web/src/features/vault/hooks/use-vault-data.ts` — wagmi contract reads
- `packages/web/src/features/vault-metrics/queries/use-vault-metrics-query.ts` — React Query
- `packages/web/src/features/depositors-list/queries/use-depositors-query.ts` — paginated query

### Configuration
- `packages/web/src/app/query-client-provider.tsx` — React Query config
- `packages/web/src/app/wagmi-provider.tsx` — wagmi config

### Supabase
- `packages/supabase-ponder/` — `@wgenie/fusion-supabase-ponder` typed client
- Env: `PONDER_DB_SUPABASE_URL` + `PONDER_DB_SUPABASE_SERVICE_ROLE_KEY`
