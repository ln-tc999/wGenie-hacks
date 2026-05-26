# Caching Strategies for Web3 Data Fetching

## Table of Contents

- [Two Cache Layers](#two-cache-layers)
- [Fetcher-Level Cache (staleTime by Data Type)](#fetcher-level-cache)
- [UI-Level Cache (Mapper Re-run Prevention)](#ui-level-cache)
- [queryClient.fetchQuery Behavior](#queryclientfetchquery-behavior)
- [Server-Side Cache](#server-side-cache)
- [Cache Invalidation](#cache-invalidation)

## Two Cache Layers

The Fetch → Mapper → Hook pattern creates two natural cache layers:

```
Layer 1: Fetcher cache (per RPC call)
  fetchTokenDecimals → staleTime: Infinity
  fetchTokenBalance  → staleTime: 60_000 (1 min)
  fetchVaultOwner    → staleTime: 30 * 60 * 1000 (30 min)

Layer 2: UI cache (per mapper/hook)
  useDisplayBalance  → staleTime: 30_000 (30s)
  useVaultDashboard  → staleTime: 60_000 (1 min)
```

**Layer 1** prevents redundant RPC calls. No matter how many mappers call `fetchTokenDecimals`, the call happens once.

**Layer 2** prevents redundant mapper execution. Even if the component re-renders, formatting/sorting/deriving won't re-run until staleTime expires.

## Fetcher-Level Cache

Choose `staleTime` based on how often the data changes:

### Immutable Data (`staleTime: Infinity`)

Data that never changes for a given contract:

```typescript
// ERC20 metadata — set once at deploy, never changes
export const getTokenDecimalsQuery = (token: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi, address: token, chainId,
    functionName: "decimals",
  }),
  staleTime: Infinity,
});

export const getTokenSymbolQuery = (token: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi, address: token, chainId,
    functionName: "symbol",
  }),
  staleTime: Infinity,
});

export const getTokenNameQuery = (token: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi, address: token, chainId,
    functionName: "name",
  }),
  staleTime: Infinity,
});
```

### Slow-Changing Data (10-30 minutes)

Data that changes rarely (governance, config, ownership):

```typescript
// Vault owner — changes only via governance
export const getVaultOwnerQuery = (vault: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: vaultAbi, address: vault, chainId,
    functionName: "owner",
  }),
  staleTime: 30 * 60 * 1000, // 30 minutes
});

// Price oracle address — rarely changes
export const getPriceOracleQuery = (vault: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: plasmaVaultAbi, address: vault, chainId,
    functionName: "getPriceOracleMiddleware",
  }),
  staleTime: 10 * 60 * 1000, // 10 minutes
});
```

### Live Data (30s - 2 minutes)

Data that changes with every block or user action:

```typescript
// Token balance — changes on transfers
export const getTokenBalanceQuery = (token: Address, chainId: number, account: Address) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi, address: token, chainId,
    functionName: "balanceOf",
    args: [account],
  }),
  staleTime: 60 * 1000, // 1 minute
});

// Vault total assets — changes with deposits/withdrawals
export const getTotalAssetsQuery = (vault: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc4626Abi, address: vault, chainId,
    functionName: "totalAssets",
  }),
  staleTime: 60 * 1000, // 1 minute
});

// Asset price — changes frequently
export const getAssetPriceQuery = (oracle: Address, asset: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: priceOracleAbi, address: oracle, chainId,
    functionName: "getAssetPrice",
    args: [asset],
  }),
  staleTime: 30 * 1000, // 30 seconds
});
```

### Quick Reference Table

| Data Type | staleTime | Examples |
|-----------|-----------|----------|
| Immutable | `Infinity` | decimals, symbol, name |
| Governance/Config | 10-30 min | owner, oracle address, vault params |
| Market State | 1-2 min | totalAssets, totalSupply, share price |
| User-specific | 30s-1 min | balanceOf, user shares, allowance |
| Price feeds | 15-30s | asset prices from oracles |

## UI-Level Cache

The hook wrapping the mapper has its own `staleTime`. This is a separate concern from fetcher caching:

```typescript
export function useVaultDashboard(vaultAddress?: Address, chainId?: number) {
  return useQuery({
    queryKey: ["vaultDashboard", chainId, vaultAddress],
    queryFn: () => vaultDashboardMapper(vaultAddress!, chainId!),
    enabled: Boolean(vaultAddress && chainId),
    staleTime: 30_000, // UI-level: mapper won't re-run for 30s
  });
}
```

**What this prevents:**
- Heavy formatting runs (BigInt → formatted string with symbols)
- Expensive array operations (sort, filter, map over hundreds of items)
- CPU-heavy number reductions and aggregations
- Unnecessary re-renders from reference instability

**How to choose UI staleTime:**
- Simple display (single value): 15-30 seconds
- Dashboard with multiple values: 30-60 seconds
- Table with sorting/filtering: 30-60 seconds
- Real-time data (prices, positions): 10-15 seconds

## queryClient.fetchQuery Behavior

Understanding how `fetchQuery` works is critical:

```typescript
const result = await queryClient.fetchQuery({
  queryKey: ["tokenDecimals", token, chainId],
  queryFn: () => readContract(...),
  staleTime: Infinity,
});
```

**On first call:** Executes `queryFn`, stores result in cache, returns result.

**On subsequent calls (within staleTime):** Returns cached result immediately. No network call.

**On subsequent calls (after staleTime):** Executes `queryFn` again, updates cache, returns new result.

**Concurrent calls with same key:** React Query deduplicates — only one network call, all callers receive the same promise.

This means multiple mappers calling the same fetcher in parallel are automatically deduplicated:

```typescript
// These two mappers run concurrently
const [balances, positions] = await Promise.all([
  balancesMapper({ tokens, chainId, account }),
  positionsMapper({ vaults, chainId, account }),
]);

// Both call fetchTokenDecimals(USDC, 1) internally
// → Only ONE RPC call happens, both get the cached result
```

## Server-Side Cache

For server-side rendering (Next.js Server Components, API routes), use a simple in-memory cache with TTL:

```typescript
// lib/rpc/cache.ts
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const getFromCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setInCache = <T>(key: string, data: T, ttlMs = 10 * 60 * 1000): void => {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
};
```

This is used by server-side RPC fetchers that run during SSR or in API route handlers. React Query's cache is not available server-side (it's a client-side singleton).

## Cache Invalidation

### After User Actions (Transactions)

After a user submits a transaction (deposit, withdraw, approve), invalidate affected queries:

```typescript
// After a deposit transaction confirms
queryClient.invalidateQueries({
  queryKey: ["tokenBalance", token, chainId, account],
});
queryClient.invalidateQueries({
  queryKey: ["vaultDashboard", vaultAddress],
});
```

### Group Invalidation

Use query key prefixes to invalidate related data:

```typescript
// Invalidate all data for a specific vault
queryClient.invalidateQueries({
  queryKey: ["vault", chainId, vaultAddress],
  // matches ["vault", 1, "0x123", "totalAssets"]
  // matches ["vault", 1, "0x123", "totalSupply"]
  // matches ["vault", 1, "0x123", "owner"]
});
```

Design your fetcher query keys with invalidation in mind:

```typescript
// Query key structure: [entity, chainId, address, field]
const getTotalAssetsQuery = (vault: Address, chainId: number) => ({
  queryKey: ["vault", chainId, vault, "totalAssets"],
  // ...
});
```
