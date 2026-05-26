---
name: web3-data-fetching
description: Web3 blockchain data fetching architecture for React applications using the Fetch → Mapper → Hook pattern. Use when writing, reviewing, or refactoring code that fetches onchain data via RPC calls, wagmi, viem, or React Query in web3/DeFi contexts. Triggers on tasks involving contract reads, token balances, vault data, multicall, DeFi frontend performance, React Query with blockchain data, or data fetching architecture decisions.
---

# Web3 Data Fetching

Architecture guide for fetching blockchain data in React. Based on patterns proven at scale by Euler Finance and applied in the wGenie monorepo.

## Core Problem

In web2, a backend prepares data — one request, one response, one `useQuery`. In web3, your "backend" is raw blockchain state across multiple contracts, RPC endpoints, and formats with no server to aggregate. Treating RPC calls like HTTP endpoints leads to:

- Hooks on hooks (500+ lines), complex `enabled` chains
- Multiple loading/error states to aggregate
- `useMemo` explosion (500 vaults x 20 memos = 10k dependency arrays)
- Unpredictable re-render storms
- No normal control flow (can't `if/else`, `for`, `throw` inside hooks)

## Architecture: Fetch → Mapper → Hook

Three layers that restore predictability:

### Layer 1 — Fetchers (RPC + Cache)

Pure functions using React Query's **non-hook API**. Each fetcher owns its `staleTime`.

```typescript
// fetcher — no hooks, just queryClient.fetchQuery()
export const getTokenDecimalsQuery = (token: Address, chainId: number) => ({
  ...readContractQueryOptions(getWagmiConfig(), {
    abi: erc20Abi, address: token, chainId,
    functionName: "decimals",
  }),
  staleTime: Infinity, // immutable, cache forever
});

export async function fetchTokenDecimals(token: Address, chainId: number) {
  return getQueryClient().fetchQuery(getTokenDecimalsQuery(token, chainId));
}
```

### Layer 2 — Mappers (Business Logic)

Plain async functions. Call fetchers, combine data, format values. Normal JS control flow.

```typescript
// mapper — plain async function, no hooks
export async function displayBalanceMapper(params: {
  token: Address; chainId: number; account: Address;
}) {
  const { token, chainId, account } = params;

  const [decimals, symbol, rawBalance] = await Promise.all([
    fetchTokenDecimals(token, chainId),  // hits cache (Infinity)
    fetchTokenSymbol(token, chainId),    // hits cache (Infinity)
    fetchTokenBalance(token, chainId, account), // fresh every 1min
  ]);

  return { balanceFormatted: formatBigInt(rawBalance, decimals, symbol) };
}
```

### Layer 3 — Hook (Reactivity for UI)

Single `useQuery` wrapping the mapper. UI-level staleTime prevents re-render storms.

```typescript
// hook — thin reactive wrapper
export function useDisplayBalance(
  token?: Address, chainId?: number, account?: Address,
) {
  return useQuery({
    queryKey: ["displayBalance", chainId, token, account],
    queryFn: () => displayBalanceMapper({ token: token!, chainId: chainId!, account: account! }),
    enabled: Boolean(token && chainId && account),
    staleTime: 30_000, // UI-level cache — prevents formatting re-runs
  });
}
```

## Key Rules

1. **Fetchers are not hooks** — use `queryClient.fetchQuery()`, not `useQuery`
2. **Mappers are not hooks** — plain async functions with normal control flow
3. **One useQuery per feature** — wraps the mapper, provides reactivity
4. **Cache at the fetcher level** — `Infinity` for immutable (decimals, symbol), short for live (balances)
5. **UI-level cache on the hook** — 15-60s staleTime prevents expensive mapper re-runs
6. **Format before UI** — all data reaches components pre-formatted, no `useMemo` needed
7. **Promise.all in mappers** — parallel fetching with normal `await`, not `useQueries`

## wGenie Monorepo Context

Our codebase uses a hybrid server-side + client-side architecture:
- **Server-side RPC enrichment** in `packages/web/src/lib/rpc/` — viem multicall with 10min in-memory cache
- **Supabase for indexed event data** — depositors, flows, activity via `@wgenie/fusion-supabase-ponder`
- **Static vault registry** from `plasma-vaults.json`
- **Server functions merge all sources** — e.g. `fetchVaults()` combines registry + RPC + Supabase

For wGenie-specific patterns and data flow, see `references/wgenie-patterns.md`.

## References

- **Full architecture with code examples**: See `references/architecture.md`
- **Common anti-patterns to avoid**: See `references/anti-patterns.md`
- **Caching strategies per data type**: See `references/caching.md`
- **wGenie monorepo data flow**: See `references/wgenie-patterns.md`
