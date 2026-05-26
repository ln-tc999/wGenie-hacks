# FSN-0079: Consolidate Alpha Tools for YO Treasury

## Overview

Unify YO Treasury agent tool rendering with Fusion Alpha by:
1. Adding ERC4626 market support to `readVaultBalances` so simulation before/after shows YO vault position changes
2. Converting both YO-specific tools (`getYoVaultsTool`, `getTreasuryAllocationTool`) to return `MarketBalancesOutput` so they render via `MarketBalancesList`
3. Removing `YoVaultsList` and `TreasuryBalances` components
4. Creating a Storybook story for the YO Treasury chat UI

## Current State Analysis

**Rendering pipeline** — Both agents share `ToolRenderer` (`tool-renderer.tsx`). It dispatches on `output.type`:
- `'yo-vaults'` → `YoVaultsList` (custom table, YO-specific)
- `'treasury-balances'` → `TreasuryBalances` (custom card, YO-specific)
- `'market-balances'` → `MarketBalancesList` (Alpha's card component)
- `'action-with-simulation'` → `ActionWithSimulation` (shared)
- `'pending-actions'` → `PendingActionsList` (shared)
- `'execute-actions'` → `ExecuteActions` (shared)

**Simulation gap** — `readVaultBalances` (`alpha/read-vault-balances.ts:258-276`) handles Aave V3, Morpho, Euler V2 markets but **skips ERC4626 markets** (IDs 100001+). YO vault positions use these markets, so `SimulationBalanceComparison` never shows YO position changes.

**Type mismatch** — `YoActionWithSimulationOutput` in `yo-treasury/types.ts` omits `balancesBefore`/`balancesAfter`, but `simulateOnFork()` returns them. The renderer casts as `ActionWithSimulationOutput` (alpha-types) anyway. Works at runtime, but TypeScript types are misleading.

### Key Discoveries:
- `readVaultBalances` market loop uses `getMarketName()` → `"ERC4626_0001"` etc. → falls through to `continue` at `read-vault-balances.ts:275`
- ERC4626 reading pattern exists in `read-yo-treasury-balances.ts:179-268`: substrates → balanceOf → convertToAssets → price oracle
- `TreasuryAsset` shape is identical to `MarketBalancesOutput['assets'][number]` — maps 1:1
- `YoPosition` maps cleanly to `MarketPosition` (supply-only, no borrow)
- `ProtocolIcon` has no entry for `'ERC4626'` — fallback renders first 2 chars

## Desired End State

After this plan:
- `getYoVaultsTool` returns `type: 'market-balances'` → renders via `MarketBalancesList`
- `getTreasuryAllocationTool` returns `type: 'market-balances'` → renders via `MarketBalancesList`
- YO action tools' simulations show before/after ERC4626 position changes in `SimulationBalanceComparison`
- `YoVaultsList` and `TreasuryBalances` components are deleted
- `ProtocolIcon` supports `'ERC4626'` with a proper icon
- A Storybook story exists for the full YO Treasury chat

### Verification:
- Open Storybook at `localhost:6007`, navigate to "YO Treasury / Chat"
- Ask agent "show my allocation" → `MarketBalancesList` card renders (not the old custom components)
- Ask agent "allocate 10 USDC to yoUSD" → `ActionWithSimulation` shows before/after with YO vault position changes
- Ask agent "show pending actions" → `PendingActionsList` renders (unchanged)
- Execute actions → `ExecuteActions` 5-step flow works (unchanged)

## What We're NOT Doing

- NOT changing `readYoTreasuryBalances` — it stays as the internal reader for YO tools
- NOT adding APR/TVL to `MarketBalancesOutput` — agent can mention these in text
- NOT changing the dashboard components (`TreasuryDashboard`, `PortfolioSummary`, `AllocationTable`)
- NOT changing the Mastra agent system prompts or tool descriptions beyond output types
- NOT changing the shared tools (`displayPendingActions`, `executePendingActions`)

## Implementation Approach

Bottom-up: start with the data layer (ERC4626 in `readVaultBalances`), then consolidate Mastra tool outputs, then clean up web rendering, then add the story.

---

## Phase 1: ERC4626 Market Support in `readVaultBalances`

### Overview
Add ERC4626 market position reading to the shared `readVaultBalances` function so that simulation balance snapshots include YO vault positions.

### Changes Required:

#### 1. Add ERC4626 ABI to `read-vault-balances.ts`

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts`

Add after the existing ABI constants (after line 48):

```typescript
/** Minimal ERC4626 ABI for reading vault positions */
const erc4626Abi = [
  {
    type: 'function',
    name: 'asset',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: 'shares', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
```

#### 2. Add ERC4626 market handling in the market loop

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts`

In the `readVaultBalances` function, add ERC4626 handling. The approach: collect ERC4626 positions during the existing loop, then push a single grouped `MarketAllocation` after the loop.

Before the `for (const marketName of marketIdSet)` loop (around line 258), add:

```typescript
// Accumulator for ERC4626 positions — grouped into one MarketAllocation
const erc4626Positions: import('./types').MarketPosition[] = [];
let erc4626TotalUsd = 0;
```

Inside the loop, add an `else if` branch after the existing `EULER_V2` case (before the `continue` at line 275):

```typescript
} else if (marketName.startsWith('ERC4626_')) {
  // Find the numeric market ID for this name
  const marketId = activeMarketIds.find(id => getMarketName(id) === marketName);
  if (!marketId) continue;

  const substrates = await plasmaVault.getMarketSubstrates(marketId);
  const vaultAddrs = substrates
    .map(s => substrateToAddress(s))
    .filter((a): a is Address => a !== undefined);

  // Pass 1: shares, symbol, underlying asset for each ERC4626 vault
  const pass1 = await publicClient.multicall({
    contracts: vaultAddrs.flatMap((addr) => [
      { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [plasmaVault.address] },
      { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
      { address: addr, abi: erc4626Abi, functionName: 'asset' as const },
    ]),
    allowFailure: true,
  });

  for (let i = 0; i < vaultAddrs.length; i++) {
    const shares = pass1[i * 3 + 0].status === 'success' ? (pass1[i * 3 + 0].result as bigint) : 0n;
    if (shares === 0n) continue;

    const vaultSymbol = pass1[i * 3 + 1].status === 'success' ? (pass1[i * 3 + 1].result as string) : '???';
    const underlyingAddr = pass1[i * 3 + 2].status === 'success' ? (pass1[i * 3 + 2].result as Address) : undefined;
    if (!underlyingAddr) continue;

    // Pass 2: convertToAssets, underlying metadata, price
    const pass2 = await publicClient.multicall({
      contracts: [
        { address: vaultAddrs[i], abi: erc4626Abi, functionName: 'convertToAssets' as const, args: [shares] },
        { address: underlyingAddr, abi: erc20Abi, functionName: 'symbol' as const },
        { address: underlyingAddr, abi: erc20Abi, functionName: 'decimals' as const },
        { address: plasmaVault.priceOracle, abi: getAssetPriceAbi, functionName: 'getAssetPrice' as const, args: [underlyingAddr] },
      ],
      allowFailure: true,
    });

    const underlyingAmount = pass2[0].status === 'success' ? (pass2[0].result as bigint) : shares;
    const underlyingSym = pass2[1].status === 'success' ? (pass2[1].result as string) : '???';
    const underlyingDec = pass2[2].status === 'success' ? Number(pass2[2].result) : 18;

    let posValueUsd = 0;
    if (pass2[3].status === 'success') {
      const [rawPrice, rawPriceDecimals] = pass2[3].result as [bigint, bigint];
      const pDecimals = Number(rawPriceDecimals);
      if (underlyingAmount > 0n && rawPrice > 0n) {
        posValueUsd = Number(underlyingAmount * rawPrice) / 10 ** (underlyingDec + pDecimals);
      }
    }

    erc4626TotalUsd += posValueUsd;
    erc4626Positions.push({
      substrate: vaultAddrs[i],
      underlyingToken: underlyingAddr,
      underlyingSymbol: underlyingSym,
      label: vaultSymbol,
      supplyFormatted: formatUnits(underlyingAmount, underlyingDec),
      supplyValueUsd: posValueUsd.toFixed(2),
      borrowFormatted: '0',
      borrowValueUsd: '0.00',
      totalValueUsd: posValueUsd.toFixed(2),
    });
  }
  continue;
}
```

After the market loop ends, push the grouped allocation:

```typescript
if (erc4626Positions.length > 0) {
  markets.push({
    marketId: 'ERC4626',
    protocol: 'ERC4626',
    positions: erc4626Positions,
    totalValueUsd: erc4626TotalUsd.toFixed(2),
  });
  totalValueUsdFloat += erc4626TotalUsd;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-mastra typecheck`
- [ ] Simulation on Anvil fork returns `balancesBefore.markets` and `balancesAfter.markets` with ERC4626 entries when simulating YO allocation actions

#### Manual Verification:
- [ ] In Storybook or web app, ask YO agent to "allocate 10 USDC to yoUSD" → `ActionWithSimulation` card shows before/after balance comparison with ERC4626 vault position changes
- [ ] Both unallocated tokens (USDC decreasing) and YO vault positions (yoUSD increasing) visible in `SimulationBalanceComparison`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Consolidate Mastra Tool Output Types

### Overview
Change both YO-specific tools to return `type: 'market-balances'` with `MarketBalancesOutput` shape. Remove redundant types.

### Changes Required:

#### 1. Update `getTreasuryAllocationTool` output

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts`

- Import `MarketBalancesOutput` from `../alpha/types` (or define the output inline)
- Change `outputSchema` to match `MarketBalancesOutput` shape:
  - `type: z.literal('market-balances')`
  - `assets` array (same shape — already compatible)
  - `markets` array with `MarketAllocation` shape
  - `totalValueUsd`, `message`, `error`
- In `execute()`: call `readYoTreasuryBalances` as before, then map `yoPositions` to a `MarketAllocation`:

```typescript
const snapshot = await readYoTreasuryBalances(publicClient, vaultAddress as Address);

// Map YO positions to MarketAllocation format
const markets = [];
if (snapshot.yoPositions.length > 0) {
  markets.push({
    marketId: 'ERC4626',
    protocol: 'ERC4626',
    positions: snapshot.yoPositions.map(pos => ({
      substrate: pos.vaultAddress,
      underlyingToken: pos.underlyingAddress,
      underlyingSymbol: pos.underlyingSymbol,
      label: pos.vaultSymbol,
      supplyFormatted: pos.underlyingFormatted,
      supplyValueUsd: pos.valueUsd,
      borrowFormatted: '0',
      borrowValueUsd: '0.00',
      totalValueUsd: pos.valueUsd,
    })),
    totalValueUsd: snapshot.yoPositions.reduce(
      (sum, p) => sum + parseFloat(p.valueUsd), 0
    ).toFixed(2),
  });
}

return {
  type: 'market-balances' as const,
  success: true,
  assets: snapshot.assets,
  markets,
  totalValueUsd: snapshot.totalValueUsd,
  message: '[UI rendered treasury holdings — do NOT list or repeat balances in text]',
};
```

- Error case: return `{ type: 'market-balances', success: false, assets: [], markets: [], totalValueUsd: '0.00', message, error }`

#### 2. Update `getYoVaultsTool` output

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`

- Change `outputSchema` to `MarketBalancesOutput` shape (same as above)
- In `execute()`:
  - Keep calling `createYoClient({chainId}).getVaults()` for LLM context
  - Keep calling `readYoTreasuryBalances` for positions
  - Map to `MarketBalancesOutput`
  - Include vault list summary in `message` for the LLM:

```typescript
const vaults = await client.getVaults();
const vaultSummary = vaults.map(v =>
  `${v.shareAsset.symbol} (${v.asset.symbol}, chain ${v.chain.id})`
).join(', ');

// Read positions if vaultAddress provided
let assets: MarketBalancesOutput['assets'] = [];
let markets: MarketBalancesOutput['markets'] = [];
let totalValueUsd = '0.00';

if (vaultAddress) {
  const publicClient = getPublicClient(chainId);
  const snapshot = await readYoTreasuryBalances(publicClient, vaultAddress as Address);
  assets = snapshot.assets;
  totalValueUsd = snapshot.totalValueUsd;

  if (snapshot.yoPositions.length > 0) {
    markets.push({
      marketId: 'ERC4626',
      protocol: 'ERC4626',
      positions: snapshot.yoPositions.map(pos => ({
        substrate: pos.vaultAddress,
        underlyingToken: pos.underlyingAddress,
        underlyingSymbol: pos.underlyingSymbol,
        label: pos.vaultSymbol,
        supplyFormatted: pos.underlyingFormatted,
        supplyValueUsd: pos.valueUsd,
        borrowFormatted: '0',
        borrowValueUsd: '0.00',
        totalValueUsd: pos.valueUsd,
      })),
      totalValueUsd: snapshot.yoPositions.reduce(
        (sum, p) => sum + parseFloat(p.valueUsd), 0
      ).toFixed(2),
    });
  }
}

return {
  type: 'market-balances' as const,
  success: true,
  assets,
  markets,
  totalValueUsd,
  message: `[UI rendered ${vaults.length} vaults. Available: ${vaultSummary}. Do NOT repeat data in text]`,
};
```

#### 3. Simplify `yo-treasury/types.ts`

**File**: `packages/mastra/src/tools/yo-treasury/types.ts`

Remove `YoVaultsOutput`, `TreasuryBalancesOutput`, `YoActionWithSimulationOutput`, `YoTreasuryToolOutput`, `YoVaultUserPosition`. Keep only `existingActionSchema` (used by action tools).

```typescript
import { z } from 'zod';

/** Shared schema for existing pending actions passed to action tools */
export const existingActionSchema = z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});
```

#### 4. Update `@wgenie/fusion-mastra` package exports

**File**: `packages/mastra/package.json`

The `./yo-treasury-types` export currently points to `src/tools/yo-treasury/types.ts` and web imports `YoVaultsOutput`, `TreasuryBalancesOutput` from it. After this change, web no longer needs these types. The export can remain (it still exports `existingActionSchema`) but no web component imports from it anymore.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-mastra typecheck`
- [ ] `getYoVaultsTool` returns `{ type: 'market-balances', ... }` with assets + markets arrays
- [ ] `getTreasuryAllocationTool` returns `{ type: 'market-balances', ... }` with assets + markets arrays

#### Manual Verification:
- [ ] In web app, ask agent "show my allocation" → tool output appears (may still render old component until Phase 3 cleanup, but data shape is correct)

**Implementation Note**: After completing this phase and automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: Clean Up Web Rendering

### Overview
Remove the YO-specific tool renderers and their cases from `ToolRenderer`. Add `ProtocolIcon` support for ERC4626.

### Changes Required:

#### 1. Update `ToolRenderer`

**File**: `packages/web/src/alpha/tools/tool-renderer.tsx`

- Remove the `'yo-vaults'` case (lines 35-36)
- Remove the `'treasury-balances'` case (lines 37-38)
- Remove imports: `YoVaultsList`, `TreasuryBalances`, `YoVaultsOutput`, `TreasuryBalancesOutput`
- Remove the `@wgenie/fusion-mastra/yo-treasury-types` import entirely

After changes, the switch handles: `'market-balances'`, `'action-with-simulation'`, `'pending-actions'`, `'execute-actions'`.

#### 2. Add `ProtocolIcon` entry for ERC4626

**File**: `packages/web/src/components/protocol-icon/protocol-icon.tsx`

Add to `PROTOCOL_ICONS`:

```typescript
'ERC4626': { icon: '/protocols/yo.svg', label: 'YO Vault', bgColor: '#D6FF34' },
```

Note: Need to create `/public/protocols/yo.svg` — use the YO brand logo. The `bgColor: '#D6FF34'` is the YO neon accent. If no SVG is available, use a generic vault icon or keep the fallback text (which would show "ER").

#### 3. Delete `YoVaultsList` component and story

**Delete files**:
- `packages/web/src/alpha/tools/yo-vaults/yo-vaults-list.tsx`
- `packages/web/src/alpha/tools/yo-vaults/yo-vaults-list.stories.tsx`

#### 4. Delete `TreasuryBalances` component and story

**Delete files**:
- `packages/web/src/alpha/tools/treasury-balances/treasury-balances.tsx`
- `packages/web/src/alpha/tools/treasury-balances/treasury-balances.stories.tsx`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors: `pnpm --filter web lint`
- [ ] No broken imports (grep for `yo-vaults-list`, `treasury-balances`, `YoVaultsOutput`, `TreasuryBalancesOutput` in `packages/web/`)

#### Manual Verification:
- [ ] In web app, ask agent "show my allocation" → `MarketBalancesList` card renders with unallocated tokens + ERC4626 market section showing YO vault positions
- [ ] Ask agent "show me the vaults" → same `MarketBalancesList` format
- [ ] Protocol icon for ERC4626 displays correctly in the market section header
- [ ] Simulation balance comparison shows ERC4626 position changes with proper icons/labels

**Implementation Note**: After completing this phase, pause for manual confirmation before Phase 4.

---

## Phase 4: Storybook Story for YO Treasury Chat

### Overview
Create a Storybook story that mounts the full `YoTreasuryOverview` (dashboard + chat) with wallet decorator for interactive testing.

### Changes Required:

#### 1. Create story file

**File**: `packages/web/src/yo-treasury/components/yo-treasury-chat.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { WalletDecorator } from '@/app/wallet.decorator';
import { YoTreasuryOverview } from './yo-treasury-overview';

const meta: Meta<typeof YoTreasuryOverview> = {
  title: 'YO Treasury / Chat',
  component: YoTreasuryOverview,
  decorators: [WalletDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof YoTreasuryOverview>;

export const Default: Story = {
  args: {
    chainId: 8453,
    vaultAddress: '0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
  },
};
```

### Prerequisites:
- Next.js dev server running (`pnpm --filter web dev`) — Storybook proxies `/api/*` to `localhost:3000`
- `ALPHA_CONFIG_TEST_PRIVATE_KEY` set in `packages/web/.env`
- Mastra agent running (integrated in Next.js or standalone)

### Success Criteria:

#### Automated Verification:
- [ ] Story file compiles without errors

#### Manual Verification:
- [ ] Open Storybook (`pnpm --filter web storybook`, port 6007)
- [ ] Navigate to "YO Treasury / Chat"
- [ ] Dashboard renders with portfolio summary and allocation table
- [ ] Chat input accepts messages and streams agent responses
- [ ] Tool outputs render as `MarketBalancesList` cards
- [ ] Wallet auto-connects (via WalletDecorator) — alpha role banner visible if wallet has role
- [ ] Can execute real transactions through the chat (allocate, withdraw, swap)

---

## Testing Strategy

### Integration Tests:
- Verify `readVaultBalances` reads ERC4626 markets on a forked chain (via Anvil)
- Verify `simulateOnFork` returns `balancesBefore.markets` and `balancesAfter.markets` with ERC4626 entries

### Manual Testing Steps (via Storybook):
1. Open "YO Treasury / Chat" story
2. Ask "show my allocation" → verify `MarketBalancesList` renders with correct data
3. Ask "allocate 1 USDC to yoUSD" → verify `ActionWithSimulation` shows before/after with ERC4626 positions
4. Ask "show pending actions" → verify `PendingActionsList` renders
5. Ask "execute" → verify `ExecuteActions` 5-step flow
6. After execution, ask "show my allocation" again → verify updated positions

## References

- Ticket: `thoughts/kuba/tickets/fsn_0079-consolidate-alpha-tools-for-yo-treasuty.md`
- ERC4626 reading pattern: `packages/mastra/src/tools/yo-treasury/read-yo-treasury-balances.ts:179-268`
- Target simulation function: `packages/mastra/src/tools/alpha/simulate-on-fork.ts`
- Balance reader to modify: `packages/mastra/src/tools/alpha/read-vault-balances.ts:258-276`
- ToolRenderer: `packages/web/src/alpha/tools/tool-renderer.tsx`
- MarketBalancesList: `packages/web/src/alpha/tools/market-balances/market-balances-list.tsx`
- ProtocolIcon: `packages/web/src/components/protocol-icon/protocol-icon.tsx`
