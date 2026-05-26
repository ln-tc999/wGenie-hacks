# Fetch → Mapper → Hook Architecture

## Table of Contents

- [Why This Architecture](#why-this-architecture)
- [Layer 1: Fetchers](#layer-1-fetchers)
- [Layer 2: Mappers](#layer-2-mappers)
- [Layer 3: Hook / UI](#layer-3-hook--ui)
- [Batch Mappers (Lists and Tables)](#batch-mappers)
- [Hybrid Data: Backend + Onchain](#hybrid-data)
- [File Organization](#file-organization)

## Why This Architecture

In web2, a backend/database prepares data: one request → one response → one `useQuery`. The frontend is a thin presentation layer.

In web3, the blockchain gives you raw, primitive state. You must do what a DB would do — join, aggregate, compute, format — all on the client. This creates a fundamental mismatch with React's hook model:

- Hooks can't use `if/else`, early `return`, `throw`, or `for` loops
- Multiple `useQuery` hooks each introduce their own loading/error/data state
- `enabled` chains become deeply nested conditional logic
- Every derived value needs `useMemo` with dependency arrays
- No clean way to fetch a dynamic number of items (arrays of tokens, vaults, etc.)

The Fetch → Mapper → Hook pattern fixes this by moving complexity out of React's reactive system.

## Layer 1: Fetchers

Fetchers are the lowest layer. Each fetcher:
- Makes exactly one RPC/HTTP call
- Uses `queryClient.fetchQuery()` (NOT a hook)
- Owns its own `staleTime` (cache duration)
- Returns raw data from the chain

### Getting queryClient Outside React

Access the same query client initialized at app root:

```typescript
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClient;
}
```

### Fetcher Pattern with wagmi

Use `readContractQueryOptions` from wagmi to generate query options, then call `fetchQuery`:

```typescript
// fetchers/token.ts
import { readContractQueryOptions } from "wagmi/query";
import { erc20Abi, type Address } from "viem";
import { getQueryClient } from "@/lib/query-client";
import { getWagmiConfig } from "@/lib/wagmi-config";

// Query options factory — reusable for both fetchQuery and useQuery
export const getTokenDecimalsQuery = (token: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi,
    address: token,
    chainId,
    functionName: "decimals",
  }),
  staleTime: Infinity, // ERC20 decimals never change
});

// Fetcher function — non-hook, cacheable
export async function fetchTokenDecimals(token: Address, chainId: number) {
  return getQueryClient().fetchQuery(getTokenDecimalsQuery(token, chainId));
}

// Balance fetcher — short cache for live data
export const getTokenBalanceQuery = (
  token: Address,
  chainId: number,
  account: Address,
) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi,
    address: token,
    chainId,
    functionName: "balanceOf",
    args: [account],
  }),
  staleTime: 60 * 1000, // 1 minute — balance changes often
});

export async function fetchTokenBalance(
  token: Address,
  chainId: number,
  account: Address,
) {
  return getQueryClient().fetchQuery(
    getTokenBalanceQuery(token, chainId, account),
  );
}
```

### Key Properties of Fetchers

- **No matter how many mappers or components call `fetchTokenDecimals`**, the RPC call only happens once (cache hit after first call)
- **Each fetcher decides its own freshness** — immutable data cached forever, live data cached briefly
- **Deduplication is automatic** — React Query deduplicates concurrent calls with the same query key
- **No React dependency** — fetchers work in any JS context (tests, scripts, server-side)

## Layer 2: Mappers

Mappers are the business logic layer. Each mapper:
- Is a plain async function (NOT a hook)
- Calls one or more fetchers
- Uses normal JS control flow (`if/else`, `for`, `throw`, early `return`)
- Formats and derives all values the UI needs
- Returns a single, clean data object

### Basic Mapper

```typescript
// mappers/display-balance.ts
import { formatUnits } from "viem";
import { fetchTokenDecimals, fetchTokenSymbol, fetchTokenBalance } from "@/fetchers/token";

export async function displayBalanceMapper(params: {
  token: Address;
  chainId: number;
  account: Address;
}): Promise<DisplayBalance> {
  const { token, chainId, account } = params;

  // Parallel fetch — cache handles deduplication
  const [decimals, symbol, rawBalance] = await Promise.all([
    fetchTokenDecimals(token, chainId),     // usually cache hit (Infinity)
    fetchTokenSymbol(token, chainId),       // usually cache hit (Infinity)
    fetchTokenBalance(token, chainId, account), // fresh every 1 minute
  ]);

  // Normal JS — format before it reaches the UI
  const formatted = formatUnits(rawBalance, decimals);
  const numeric = parseFloat(formatted);

  return {
    raw: rawBalance,
    formatted: `${numeric.toFixed(4)} ${symbol}`,
    numeric,
    symbol,
    decimals,
  };
}
```

### Mapper with Conditional Logic

Because mappers are plain functions, you can use normal control flow:

```typescript
// mappers/vault-position.ts
export async function vaultPositionMapper(params: {
  vaultAddress: Address;
  chainId: number;
  account: Address;
}) {
  const { vaultAddress, chainId, account } = params;

  // Step 1: Fetch vault — can throw early
  const vault = await fetchVault(vaultAddress, chainId);
  if (!vault) throw new Error("Vault not found");

  // Step 2: Check verification — can return early
  const isVerified = await fetchIsVerified(vaultAddress, chainId);
  if (!isVerified) return { status: "unverified" as const, vault };

  // Step 3: Fetch dependent data in parallel
  const [shares, totalAssets, totalSupply, assetDecimals] = await Promise.all([
    fetchShareBalance(vaultAddress, chainId, account),
    fetchTotalAssets(vaultAddress, chainId),
    fetchTotalSupply(vaultAddress, chainId),
    fetchAssetDecimals(vault.asset, chainId),
  ]);

  // Step 4: Compute derived values with normal math
  const userAssets = totalSupply > 0n
    ? (shares * totalAssets) / totalSupply
    : 0n;

  return {
    status: "active" as const,
    vault,
    shares,
    userAssets,
    userAssetsFormatted: formatUnits(userAssets, assetDecimals),
  };
}
```

Compare this with hook-heavy approach where each `useQuery` needs its own `enabled` check, loading state, and error handling.

## Layer 3: Hook / UI

The UI layer is deliberately "dumb". A single `useQuery` wraps the mapper to provide reactivity.

### Hook Wrapper

```typescript
// hooks/use-display-balance.ts
export function getDisplayBalanceQuery(
  token?: Address,
  chainId?: number,
  account?: Address,
) {
  return {
    queryKey: ["displayBalance", chainId, token, account] as const,
    queryFn: () =>
      displayBalanceMapper({
        token: token!,
        chainId: chainId!,
        account: account!,
      }),
    enabled: Boolean(token && chainId && account),
    staleTime: 30_000, // UI-level cache: mapper won't re-run for 30s
  };
}

export function useDisplayBalance(
  token?: Address,
  chainId?: number,
  account?: Address,
) {
  return useQuery(getDisplayBalanceQuery(token, chainId, account));
}
```

### Component

```tsx
function BalanceDisplay({ token, chainId, account }: Props) {
  const { data, isLoading, isError } = useDisplayBalance(token, chainId, account);

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage />;

  // Data is already formatted — just render it
  return <span className="font-mono">{data.formatted}</span>;
}
```

No `useMemo`. No formatting in JSX. No derived calculations in the component.

## Batch Mappers

For lists (tables, dashboards), mappers compose naturally:

```typescript
// mappers/display-balances.ts
export async function displayBalancesMapper(params: {
  tokens: Address[];
  chainId: number;
  account: Address;
}): Promise<DisplayBalance[]> {
  const { tokens, chainId, account } = params;

  if (!tokens.length) return []; // simple early return

  // Parallel: fetch all token balances concurrently
  // Cache handles duplicates efficiently
  const rows = await Promise.all(
    tokens.map((token) =>
      displayBalanceMapper({ token, chainId, account }),
    ),
  );

  // Sort — just a normal array operation
  rows.sort((a, b) => b.numeric - a.numeric);

  return rows;
}
```

With hooks, this would require `useQueries` which introduces even more reactivity and still can't do conditional fetching cleanly. With mappers, it's just a `map` and `sort`.

## Hybrid Data

Even with a backend (API, subgraph, Supabase), some data must come directly from the chain — values that are too time-sensitive, user-specific, or transaction-gating.

The Fetch → Mapper → Hook pattern handles this naturally:

```typescript
// Fetchers abstract the data source
async function fetchVaultApy(vaultAddress: Address, chainId: number) {
  // From backend API
  const res = await fetch(`/api/vaults/${chainId}/${vaultAddress}/apy`);
  return res.json();
}

async function fetchUserShares(vaultAddress: Address, chainId: number, account: Address) {
  // From chain (live, user-specific)
  return getQueryClient().fetchQuery(
    getShareBalanceQuery(vaultAddress, chainId, account),
  );
}

// Mapper doesn't care where data comes from
export async function vaultDashboardMapper(params: { ... }) {
  const [apy, shares, tvl] = await Promise.all([
    fetchVaultApy(params.vaultAddress, params.chainId),       // backend
    fetchUserShares(params.vaultAddress, params.chainId, params.account), // chain
    fetchTvl(params.vaultAddress, params.chainId),            // backend
  ]);

  return { apy, shares, tvl, /* formatted values */ };
}
```

The fetchers isolate **how** and **where** data comes from. The mappers combine and normalize. The UI receives a single, clean object.

## File Organization

```
src/
├── fetchers/          # Layer 1 — one file per contract/data source
│   ├── token.ts       # ERC20 reads (decimals, symbol, balanceOf)
│   ├── vault.ts       # ERC4626 reads (totalAssets, totalSupply, asset)
│   └── price-oracle.ts
├── mappers/           # Layer 2 — one file per UI feature
│   ├── display-balance.ts
│   ├── vault-position.ts
│   └── vault-dashboard.ts
├── hooks/             # Layer 3 — thin wrappers
│   ├── use-display-balance.ts
│   ├── use-vault-position.ts
│   └── use-vault-dashboard.ts
└── components/        # Pure presentation
    ├── balance-display.tsx
    └── vault-card.tsx
```

Fetchers organized by contract/data source. Mappers organized by UI feature. Hooks are 1:1 with mappers.
