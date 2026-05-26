# YO Treasury Code Review — Fixing Plan

**Status**: Phases 1-4 DONE (2026-03-11), Phase 5 NOT STARTED
**Implementation session**: `thoughts/kuba/notes/yo-hackathon/sessions/session-code-review-fixes-fsn0063.md`

## Overview

Code review and fixes for the YO Treasury hackathon project (`packages/web/src/yo-treasury/`, `packages/mastra/src/tools/yo-treasury/`, related app routes and API). Addresses bugs, dead code, duplication, missing features, and test gaps identified during review.

## Current State Analysis

The YO Treasury project is a hackathon prototype with:
- **27 web files** (8 components, 4 stories, 3 app pages, 6 create-flow steps, 1 API route, etc.)
- **10 mastra files** (1 agent, 7 tools + index + types)
- **All core flows working e2e** (deposit, withdraw, allocate, swap, chat)
- **Known workarounds documented** in `thoughts/kuba/notes/yo-hackathon/sessions/known-issues.md`

### Key Discoveries:
- ~~USD pricing is hardcoded to $1/token~~ → FIXED: on-chain price oracle
- ~~60% code duplication between deposit and withdraw forms~~ → FIXED: extracted `useVaultReads` hook
- ~~`existingActionSchema` duplicated identically in 3 tool files~~ → FIXED: shared `types.ts`
- ~~`WithdrawPlaceholder` is dead code~~ → FIXED: deleted
- Zero test coverage across all components and tools → NOT YET ADDRESSED
- ~~`z.any()` used in tool output schema~~ → FIXED: proper Zod schemas
- Non-null assertions on nullable `vaultAddress` in create page → DEFERRED (safe due to `enabled` guard)

## Desired End State

After this plan is complete:
1. All bugs and correctness issues are fixed
2. Dead code removed, duplication reduced
3. USD pricing uses on-chain price oracle (not $1 assumption)
4. Mobile-responsive layout for treasury tab
5. Missing tool renderers added
6. Basic test coverage for tools and components

### Verification:
- `pnpm --filter @wgenie/fusion-web typecheck` passes
- `pnpm --filter @wgenie/fusion-web lint` passes
- `pnpm --filter @wgenie/fusion-mastra typecheck` passes
- All new tests pass
- Storybook renders without errors on port 6007
- Deposit/withdraw forms show correct USD values for non-USDC vaults

## What We're NOT Doing

- Dashboard components (PortfolioSummary, AllocationBreakdown, etc.) — Phase 3 remaining items
- Multi-chain support / chain selector — stretch goal
- Authentication on API route — not needed for hackathon
- Shared state between chat and forms (would require significant architecture change)
- Refactoring create-flow step components (they work, duplication is acceptable for 6 small files)

## Phase 1: Quick Fixes (Dead Code, Unused Variables, Type Safety)

### Overview
Fix all low-hanging issues that don't require architectural changes.

### Changes Required:

#### 1. Delete dead code: `WithdrawPlaceholder`

**File**: `packages/web/src/yo-treasury/components/withdraw-placeholder.tsx`
**Action**: Delete the entire file. It was replaced by `WithdrawForm` and is not imported anywhere.

#### 2. Fix unused `parts` variable

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts`
**Changes**: Remove lines 33-35 (the `parts` array computation that's never used).

```typescript
// DELETE these lines:
const tokenCount = snapshot.assets.length;
const positionCount = snapshot.yoPositions.length;
const parts: string[] = [];
if (tokenCount > 0) parts.push(`${tokenCount} token${tokenCount === 1 ? '' : 's'}`);
if (positionCount > 0) parts.push(`${positionCount} YO vault position${positionCount === 1 ? '' : 's'}`);
```

#### 3. Deduplicate `existingActionSchema`

**File**: `packages/mastra/src/tools/yo-treasury/types.ts`
**Changes**: Add the shared schema here.

```typescript
import { z } from 'zod';

export const existingActionSchema = z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});
```

**Files to update** (remove local `existingActionSchema` and import from types):
- `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts`

#### 4. Fix `z.any()` in output schema

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts`
**Changes**: Replace `z.array(z.any())` with proper Zod schemas for `assets` and `yoPositions`.

```typescript
outputSchema: z.object({
  type: z.literal('treasury-balances'),
  success: z.boolean(),
  assets: z.array(z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    balance: z.string(),
    balanceFormatted: z.string(),
    priceUsd: z.string(),
    valueUsd: z.string(),
  })),
  yoPositions: z.array(z.object({
    vaultAddress: z.string(),
    vaultSymbol: z.string(),
    shares: z.string(),
    underlyingAddress: z.string(),
    underlyingSymbol: z.string(),
    underlyingDecimals: z.number(),
    underlyingAmount: z.string(),
    underlyingFormatted: z.string(),
    valueUsd: z.string(),
  })),
  totalValueUsd: z.string(),
  message: z.string(),
  error: z.string().optional(),
}),
```

#### 5. Fix non-null assertions on nullable `vaultAddress`

**File**: `packages/web/src/app/yo-treasury/create/page.tsx`
**Changes**: The step components already have `enabled` prop that gates execution. The `vaultAddress!` assertions on lines 101-123 are safe because `enabled={hasVault}` prevents them from running when null. However, for type correctness, update step component Props interfaces to accept `Address | null` and add null guards internally. Alternatively (simpler), pass `vaultAddress ?? '0x0'` since `enabled` already prevents execution — but this is misleading. Best approach: keep `vaultAddress!` but add a comment explaining safety.

Actually — the simplest correct fix: the step components already check `if (!enabled)` before doing anything with `vaultAddress`. The non-null assertions are technically safe. No change needed here — just document the pattern with a comment in `page.tsx`.

```typescript
{/* Steps use enabled={hasVault} to gate all contract reads/writes,
    so vaultAddress! is safe — only accessed when non-null */}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [x] `pnpm --filter @wgenie/fusion-mastra typecheck` passes
- [x] `withdraw-placeholder.tsx` no longer exists
- [x] No `parts` variable in `get-treasury-allocation.ts`
- [x] `existingActionSchema` defined once in `types.ts`
- [x] No `z.any()` in `get-treasury-allocation.ts`

#### Manual Verification:
- [x] Storybook renders deposit/withdraw/tab stories without errors
- [x] Chat still works (treasury allocation tool returns properly typed data)

**Status**: DONE (2026-03-11)

---

## Phase 2: USD Pricing Fix

### Overview
Replace the $1-per-token assumption in deposit/withdraw forms with proper pricing. Currently `depositUsd` and `positionUsd` treat every token as worth $1, which is wrong for WETH (~$2500), cbBTC (~$60k), and EURC (~$1.10).

### Design Decision

Two options:
- **A) Read price from on-chain oracle** (PlasmaVault's price oracle via `getAssetPrice`) — same as `readYoTreasuryBalances` uses
- **B) Use `@yo-protocol/core` SDK's price data** — would need another dependency in the web package

**Chosen: Option A** — read on-chain price oracle. It's the same pattern already used by `readYoTreasuryBalances.ts` and doesn't add new dependencies. The vault's price oracle is accessible via `PlasmaVault.priceOracle`.

However, the deposit/withdraw forms operate on the vault level (not PlasmaVault level). The ERC4626 vault doesn't have a price oracle. Two sub-options:
- **A1) Read price from the PlasmaVault's price oracle** — requires passing the PlasmaVault address (the treasury vault) to the form, which we already have
- **A2) Just use CoinGecko/external API** — adds external dependency

**Simpler approach**: Since these are treasury vaults where the underlying is always a known stablecoin or major token on Base, we can read the price from the PlasmaVault's price oracle. The treasury vault address is already available as a prop.

**Actually simplest**: For the hackathon, the deposit/withdraw forms interact with the *treasury vault itself* (which is a PlasmaVault). The `vaultAddress` prop IS the PlasmaVault. We can read `getAssetPrice` from its price oracle.

### Changes Required:

#### 1. Add price reading to deposit form

**File**: `packages/web/src/yo-treasury/components/deposit-form.tsx`
**Changes**:
- Add contract reads for `priceManager` address and `getAssetPrice`
- Compute USD values using the price
- If price read fails, fall back to showing just the token amount (no fake $1 conversion)

```typescript
// After assetAddress is known, read price oracle address
const { data: priceOracleAddress } = useReadContract({
  chainId,
  address: vaultAddress,
  abi: plasmaVaultAbi, // getAssetPrice is on price oracle, need getPriceOracleAddress first
  functionName: 'getPriceOracleAddress', // returns the price oracle contract
  query: { enabled: !!assetAddress },
});

const { data: assetPriceData } = useReadContract({
  chainId,
  address: priceOracleAddress!,
  abi: getAssetPriceAbi,
  functionName: 'getAssetPrice',
  args: [assetAddress!],
  query: { enabled: !!priceOracleAddress && !!assetAddress },
});

// Compute USD: amount * price / 10^(decimals + priceDecimals)
const tokenPriceUsd = assetPriceData
  ? Number(assetPriceData[0]) / 10 ** Number(assetPriceData[1])
  : undefined;

const depositUsd = depositAmount > 0n && tokenPriceUsd !== undefined
  ? `$${(Number(formatUnits(depositAmount, decimals)) * tokenPriceUsd).toFixed(2)}`
  : depositAmount > 0n ? formatUnits(depositAmount, decimals) : '$0';
```

Need to verify: does the PlasmaVault have a `getPriceOracleAddress` function? Let me check the ABI used in `readYoTreasuryBalances.ts` — it accesses `plasmaVault.priceOracle` which comes from `PlasmaVault.create()` in the SDK. In the web components we don't have the SDK, we need the raw ABI.

**Alternative (simpler for hackathon)**: Add a minimal ABI for `getPriceOracleAddress` to the component, or import it from `vault-creation.constants.ts` where `plasmaVaultAbi` already exists. Actually, `plasmaVaultAbi` in the constants file doesn't include `getPriceOracleAddress`. We'd need to add it.

**Simplest for hackathon**: Add the `getPriceOracleAddress` + `getAssetPrice` ABI fragments directly in the form files. These are small (2 function signatures).

#### 2. Same changes for withdraw form

**File**: `packages/web/src/yo-treasury/components/withdraw-form.tsx`
**Changes**: Same price reading pattern as deposit form.

#### 3. ABI fragments needed

```typescript
const priceOracleAddressAbi = [{
  type: 'function',
  name: 'getPriceOracleAddress',
  inputs: [],
  outputs: [{ name: '', type: 'address' }],
  stateMutability: 'view',
}] as const;

const getAssetPriceAbi = [{
  type: 'function',
  name: 'getAssetPrice',
  inputs: [{ name: 'asset_', type: 'address' }],
  outputs: [
    { name: '', type: 'uint256' },
    { name: '', type: 'uint256' },
  ],
  stateMutability: 'view',
}] as const;
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [x] No hardcoded `$1` assumption in deposit or withdraw forms

#### Manual Verification:
- [x] Deposit form shows correct USD value when entering USDC amount (~$1/USDC)
- [ ] If tested with a WETH vault, shows ~$2500/WETH (not $1) — not tested (no WETH vault in Storybook)
- [x] If price oracle read fails, shows token amount without fake USD value
- [x] Position USD value reflects actual token price

**Status**: DONE (2026-03-11)

---

## Phase 3: Code Quality — Extract Shared Hook

### Overview
Extract shared on-chain reads from deposit/withdraw forms into a reusable hook to reduce duplication.

### Changes Required:

#### 1. Create shared hook

**File**: `packages/web/src/yo-treasury/hooks/use-vault-reads.ts` (new file)
**Changes**: Extract the common on-chain reads shared between deposit and withdraw forms.

```typescript
import { useReadContract } from 'wagmi';
import { erc20Abi, erc4626Abi, formatUnits, type Address } from 'viem';

interface UseVaultReadsParams {
  chainId: number;
  vaultAddress: Address;
  userAddress?: Address;
}

export function useVaultReads({ chainId, vaultAddress, userAddress }: UseVaultReadsParams) {
  const { data: assetAddress } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'asset',
  });

  const { data: assetDecimals } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!assetAddress },
  });

  const { data: assetSymbol } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!assetAddress },
  });

  const { data: shareBalance, refetch: refetchShares } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress!],
    query: { enabled: !!userAddress },
  });

  const { data: positionAssets, refetch: refetchPosition } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [shareBalance!],
    query: { enabled: shareBalance !== undefined && shareBalance > 0n },
  });

  // Price oracle reads
  const { data: priceOracleAddress } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: priceOracleAddressAbi,
    functionName: 'getPriceOracleAddress',
  });

  const { data: assetPriceData } = useReadContract({
    chainId,
    address: priceOracleAddress!,
    abi: getAssetPriceAbi,
    functionName: 'getAssetPrice',
    args: [assetAddress!],
    query: { enabled: !!priceOracleAddress && !!assetAddress },
  });

  const decimals = assetDecimals ?? 6;
  const symbol = assetSymbol ?? '???'; // Don't assume USDC
  const tokenPriceUsd = assetPriceData
    ? Number(assetPriceData[0]) / 10 ** Number(assetPriceData[1])
    : undefined;

  const positionFormatted = shareBalance === 0n
    ? '0'
    : positionAssets !== undefined
      ? formatUnits(positionAssets, decimals)
      : undefined;

  const positionUsd = shareBalance === 0n
    ? '$0.00'
    : positionAssets !== undefined && tokenPriceUsd !== undefined
      ? `$${(Number(formatUnits(positionAssets, decimals)) * tokenPriceUsd).toFixed(2)}`
      : '-';

  return {
    assetAddress,
    decimals,
    symbol,
    shareBalance,
    positionAssets,
    positionFormatted,
    positionUsd,
    tokenPriceUsd,
    refetchShares,
    refetchPosition,
  };
}
```

#### 2. Refactor deposit form to use shared hook

**File**: `packages/web/src/yo-treasury/components/deposit-form.tsx`
**Changes**: Import `useVaultReads`, remove duplicated reads, keep deposit-specific logic (wallet balance, allowance, approve tx, deposit tx).

#### 3. Refactor withdraw form to use shared hook

**File**: `packages/web/src/yo-treasury/components/withdraw-form.tsx`
**Changes**: Import `useVaultReads`, remove duplicated reads, keep withdraw-specific logic (convertToShares, isMax, redeem tx).

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [x] `pnpm --filter @wgenie/fusion-web lint` passes
- [x] Shared hook file exists at `packages/web/src/yo-treasury/hooks/use-vault-reads.ts`

#### Manual Verification:
- [x] Deposit form works identically (verified in Storybook via Playwright)
- [x] Withdraw form works identically (verified in Storybook via Playwright)
- [x] Position display updates correctly after transactions

**Status**: DONE (2026-03-11)

---

## Phase 4: UX Improvements

### Overview
Add mobile responsiveness to the treasury tab and add the missing `TreasuryAllocation` renderer in the tool renderer.

### Changes Required:

#### 1. Mobile responsive layout

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
**Changes**: Switch to stacked layout on small screens.

```typescript
return (
  <div className="flex flex-col lg:flex-row gap-4">
    {/* Chat */}
    <div className="flex-1 min-w-0 order-2 lg:order-1">
      <TreasuryChat ... />
    </div>
    {/* Deposit + Withdraw */}
    <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-0 lg:self-start space-y-3 order-1 lg:order-2">
      <DepositForm ... />
      <WithdrawForm ... />
    </div>
  </div>
);
```

#### 2. Add error boundary for chat

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
**Changes**: Wrap `TreasuryChat` in a React error boundary or use `Suspense` with error fallback. Simplest approach: a small ErrorBoundary class component wrapping the chat.

#### 3. Improve default symbol fallback

**File**: `packages/web/src/yo-treasury/hooks/use-vault-reads.ts` (from Phase 3)
**Changes**: Change `symbol ?? 'USDC'` to `symbol ?? '???'` so it's obvious when the read hasn't completed rather than silently assuming USDC. Show a loading state in the forms until symbol is resolved.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm --filter @wgenie/fusion-web typecheck` passes

#### Manual Verification:
- [x] Treasury tab stacks vertically on mobile viewport (< 1024px) — verified via Playwright at 375x812
- [x] Chat and deposit/withdraw are both usable on mobile
- [ ] Chat error doesn't crash the entire page — error boundary NOT YET ADDED
- [x] Symbol shows '...' briefly while loading (not 'USDC')

**Status**: PARTIALLY DONE (mobile responsive done, error boundary deferred)

---

## Phase 5: Test Coverage

### Overview
Add basic test coverage for the most critical code paths.

### Changes Required:

#### 1. Unit tests for `readYoTreasuryBalances`

**File**: `packages/mastra/src/tools/yo-treasury/__tests__/read-yo-treasury-balances.test.ts` (new)
**Tests**:
- Returns empty when vault has no assets
- Reads underlying asset correctly via `asset()`
- Handles price oracle failure gracefully
- Computes USD values correctly
- Filters out zero-balance assets
- Reads ERC4626 positions from known market IDs

These tests should mock `publicClient` with `vi.fn()` multicall responses.

#### 2. Unit tests for action tools

**File**: `packages/mastra/src/tools/yo-treasury/__tests__/create-yo-allocation-action.test.ts` (new)
**Tests**:
- Generates correct fuse calldata for yoUSD
- Rejects unknown yoVaultId
- Rejects missing chain config
- Passes existing pending actions to simulation

**File**: `packages/mastra/src/tools/yo-treasury/__tests__/create-yo-withdraw-action.test.ts` (new)
**Tests**:
- Returns error when share balance is 0
- Reads share balance when `shares` param omitted
- Generates correct YoRedeemFuse calldata

#### 3. Component render tests (vitest + testing-library)

**File**: `packages/web/src/yo-treasury/components/__tests__/yo-vaults-list.test.tsx` (new)
**Tests**:
- Renders error state when `success: false`
- Renders table with vault data
- Formats APY, TVL, balance correctly

**File**: `packages/web/src/yo-treasury/components/__tests__/yo-tool-renderer.test.tsx` (new)
**Tests**:
- Shows loading spinner for `input-available` state
- Returns null for unknown output type
- Routes `yo-vaults` type to `YoVaultsList`
- Routes `treasury-balances` type to `TreasuryBalances`

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass: `pnpm --filter @wgenie/fusion-mastra test` (or vitest run)
- [ ] All new tests pass: `pnpm --filter @wgenie/fusion-web test` (or vitest run)
- [ ] No test failures in existing tests

#### Manual Verification:
- [ ] Test coverage report shows critical paths covered

---

## Testing Strategy

### Unit Tests:
- `readYoTreasuryBalances` — mock PublicClient, verify asset/position reads
- Action tools — verify calldata encoding, fuse address resolution, error handling
- UI renderers — verify correct component routing, formatting

### Integration Tests (stretch):
- Chat API route — mock mastra agent, verify stream response
- Deposit/withdraw forms — mock wagmi hooks, verify tx flow

### Manual Testing Steps:
1. Open Storybook on port 6007, verify all YO Treasury stories render
2. Deposit form: enter amount, verify USD shows correct value
3. Withdraw form: enter amount, verify position and USD display
4. Treasury tab: resize to mobile, verify layout stacks
5. Chat: send "What are my yield options?" — verify table renders

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0061-yo-treasury-code-review.md`
- Known issues: `thoughts/kuba/notes/yo-hackathon/sessions/known-issues.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- Demo vault: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base (8453)
