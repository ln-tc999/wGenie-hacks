# Anti-Patterns in Web3 Data Fetching

## Table of Contents

- [Hook-Heavy Approach](#hook-heavy-approach)
- [useMemo Explosion](#usememo-explosion)
- [Unpredictable Re-renders](#unpredictable-re-renders)
- [Early Abstractions](#early-abstractions)
- [useQueries for Dynamic Lists](#usequeries-for-dynamic-lists)

## Hook-Heavy Approach

### The Problem

Using a separate `useQuery` / `useReadContract` for every data point:

```typescript
// BAD: hook-heavy approach
function useVaultPosition(vaultAddress: Address, account: Address) {
  // 1: Fetch vault
  const { data: vault, isLoading: isVaultLoading } = useVault({
    address: vaultAddress,
    query: { refetchOnMount: false },
  });

  // 2: Fetch net asset value (depends on vault)
  const { data: netAssetValue, isLoading: isNavLoading } = useNetAssetValue({
    accountAddress: account,
    vaultAddress,
    enabled: Boolean(vault), // enabled #1
  });

  // 3: Fetch APY (also depends on vault)
  const { data: apy, isLoading: isApyLoading } = useApy({
    account,
    vaultAddress,
    enabled: Boolean(vault), // enabled #2
  });

  // Global loading state — grows with every hook
  const isLoading = isVaultLoading || isNavLoading || isApyLoading;
  // TODO: error states too...

  return { vault, netAssetValue, apy, isLoading };
}
```

**Why this breaks down:**
- 3 hooks = 3 query keys, 3 loading states, 3 error states, 3 `enabled` conditions
- Every data point brings an entire bundle of React Query state (status flags, fetch timestamps, etc.)
- Since hooks depend on each other, the composite hook is "loading" if *any* query is loading
- In practice you need all the data anyway — the multiple hooks serve only one purpose: caching
- Adding a new requirement (e.g., "check if vault is verified before fetching") means touching every hook's `enabled` chain

### The Fix

A single mapper with a single hook wrapper:

```typescript
// GOOD: mapper approach
async function vaultPositionMapper(vaultAddress: Address, account: Address) {
  const vault = await fetchVault(vaultAddress);
  if (!vault) throw new Error("Vault not found");

  const [netAssetValue, apy] = await Promise.all([
    fetchNetAssetValue({ accountAddress: account, vaultAddress }),
    fetchApy({ account, vaultAddress }),
  ]);

  return { vault, netAssetValue, apy };
}

// Thin hook wrapper
function useVaultPosition(vaultAddress?: Address, account?: Address) {
  return useQuery({
    queryKey: ["vaultPosition", vaultAddress, account],
    queryFn: () => vaultPositionMapper(vaultAddress!, account!),
    enabled: Boolean(vaultAddress && account),
  });
}
```

One loading state. One error state. Normal control flow. Caching still handled by fetchers internally.

## useMemo Explosion

### The Problem

In web3, the blockchain gives raw primitive state. You must compute everything yourself — formatted balances, share prices, APYs, USD values. Each computation becomes a `useMemo`:

```typescript
// BAD: memo per derived value
const formattedBalance = useMemo(
  () => formatUnits(rawBalance, decimals),
  [rawBalance, decimals],
);

const usdValue = useMemo(
  () => parseFloat(formattedBalance) * price,
  [formattedBalance, price],
);

const sharePrice = useMemo(
  () => totalSupply > 0n ? Number(formatUnits(totalAssets, decimals)) / Number(formatUnits(totalSupply, decimals)) : 0,
  [totalAssets, totalSupply, decimals],
);
```

**The math at scale:**
- 10 vaults x 20 memos each = 200 dependency arrays
- 500 vaults x 20 memos each = **10,000 dependency arrays**

Every re-render triggers dependency comparisons, recalculations, diffing, and memory allocation for all of them. One unstable dependency reference triggers a cascade.

### The Fix

Format everything in the mapper. Data reaches the UI pre-computed:

```typescript
// GOOD: compute in mapper, no memos needed
async function vaultDisplayMapper(vaultAddress: Address, chainId: number) {
  const [totalAssets, totalSupply, decimals, price] = await Promise.all([
    fetchTotalAssets(vaultAddress, chainId),
    fetchTotalSupply(vaultAddress, chainId),
    fetchAssetDecimals(vaultAddress, chainId),
    fetchAssetPrice(vaultAddress, chainId),
  ]);

  const sharePrice = totalSupply > 0n
    ? Number(formatUnits(totalAssets, decimals)) / Number(formatUnits(totalSupply, decimals))
    : 0;

  const tvl = Number(formatUnits(totalAssets, decimals));

  return {
    sharePrice: sharePrice.toFixed(4),
    tvl: formatCurrency(tvl),
    tvlUsd: formatCurrency(tvl * price),
  };
}
```

Zero `useMemo`. The mapper runs once per cache window (controlled by the hook's `staleTime`).

## Unpredictable Re-renders

### The Problem

When the data layer is too reactive with many hooks, the UI re-renders unpredictably. The instinct is to add `useMemo`:

> "Let's just wrap it in `useMemo`."

But `useMemo` doesn't eliminate complexity — it adds more:
- Another dependency array
- Another equality check
- More memory
- Another place things can go wrong

A hook with 7 `useQuery` calls + 3-5 `useMemo` calls = **10+ dependency arrays** React must compare on every render.

As the app scales:
- Number of dependency arrays increases
- Number of query keys explodes
- One unstable reference triggers a cascade
- The UI becomes impossible to predict
- Small mistakes cause large re-render storms

### The Fix

The UI-level `staleTime` on the hook wrapping the mapper acts as a re-render shield:

```typescript
// The mapper does ALL the heavy work (formatting, sorting, deriving)
// The hook caches the result for 30 seconds
function useVaultDashboard(vaultAddress?: Address) {
  return useQuery({
    queryKey: ["vaultDashboard", vaultAddress],
    queryFn: () => vaultDashboardMapper(vaultAddress!),
    enabled: Boolean(vaultAddress),
    staleTime: 30_000, // mapper won't re-run for 30s even if component re-renders
  });
}
```

Heavy formatting, expensive maps, large number reductions, symbol/sign parsing — all run **once per staleTime window**, not on every render.

## Early Abstractions

### The Problem

In early stages, you don't fully understand the real data flows, scale, or how features will evolve. You create "reusable" abstractions:

```typescript
// BAD: premature abstraction
function useContractRead<T>(params: {
  address: Address;
  abi: Abi;
  functionName: string;
  chainId: number;
  transform?: (data: unknown) => T;
  dependsOn?: unknown[];
}) {
  // 50+ lines of generic logic trying to handle every case
  // enabled conditions, error handling, caching, transform, retry...
}
```

These abstractions are built on assumptions that turn out wrong. When requirements change, you're fighting the abstraction instead of solving the problem.

### The Fix

Start with concrete fetchers and mappers. Abstractions emerge naturally when you see real patterns:

```typescript
// GOOD: concrete, simple, easy to change
export async function fetchTotalAssets(vault: Address, chainId: number) {
  return getQueryClient().fetchQuery({
    ...readContractQueryOptions(getWagmiConfig(), {
      abi: erc4626Abi, address: vault, chainId,
      functionName: "totalAssets",
    }),
    staleTime: 60_000,
  });
}
```

Three similar fetchers are better than a premature abstraction. Extract a pattern only when you've written the same thing 5+ times.

## useQueries for Dynamic Lists

### The Problem

When you need to fetch data for a list (tokens, vaults, positions), the hook-based approach forces you into `useQueries`:

```typescript
// BAD: useQueries for dynamic list
const results = useQueries({
  queries: tokens.map((token) => ({
    queryKey: ["balance", token, account],
    queryFn: () => fetchBalance(token, account),
    enabled: Boolean(account),
  })),
});

// Now manage N loading states, N error states...
const isLoading = results.some((r) => r.isLoading);
const balances = results.map((r) => r.data).filter(Boolean);

// Want to sort? Need useMemo with unstable reference
const sorted = useMemo(
  () => [...balances].sort((a, b) => b.amount - a.amount),
  [balances], // reference changes every render!
);
```

### The Fix

A batch mapper with a normal `for`/`map` loop:

```typescript
// GOOD: batch mapper
async function balancesMapper(tokens: Address[], chainId: number, account: Address) {
  if (!tokens.length) return [];

  const rows = await Promise.all(
    tokens.map((token) => displayBalanceMapper({ token, chainId, account })),
  );

  // Just sort — no useMemo, no unstable references
  rows.sort((a, b) => b.numeric - a.numeric);
  return rows;
}

// Single hook for the whole list
function useBalances(tokens: Address[], chainId?: number, account?: Address) {
  return useQuery({
    queryKey: ["balances", chainId, tokens, account],
    queryFn: () => balancesMapper(tokens, chainId!, account!),
    enabled: Boolean(chainId && account && tokens.length),
    staleTime: 30_000,
  });
}
```

One loading state. One error state. Sorting built into the mapper. No `useMemo`.
