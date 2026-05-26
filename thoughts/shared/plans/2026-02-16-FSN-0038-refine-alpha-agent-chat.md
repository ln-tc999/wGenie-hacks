# FSN-0038: Refine Alpha Agent Chat — Implementation Plan

## Overview

Polish the Alpha Agent chat experience with UX improvements: correct market labels for Morpho/Euler, better icon contrast, hide unchanged balance rows, link tx hashes to block explorers, dark theme in Storybook. Rewrite agent persona to professional Portfolio Manager tone. Create a `/demo-alpha` slash command that adaptively tests the full flow using Playwright MCP against live on-chain state — designed for client demo sessions.

## Current State Analysis

- **Protocol icons**: Morpho SVG is entirely white (`fill="white"`) — invisible on light backgrounds, needs a dark container
- **Market labels**: `MarketPosition` has `underlyingSymbol` (e.g., "USDC") but no descriptive label. Webapp resolves Morpho markets to "COLLATERAL/LOAN" format via on-chain RPC, and Euler vaults to human-readable names via static JSON
- **SimulationBalanceComparison**: Shows all rows including unchanged ones (`$0.00 → $0.00`)
- **Tx hash display**: Both `SimulationResult` and `ExecuteActions` show tx hash as plain monospace text (`tx: 0x1234...5678`) — no explorer link, no copy button
- **Storybook**: Default theme is `light`; ticket requests `dark`
- **Agent text**: May output raw bigint amounts in text responses
- **Existing components**: `BlockExplorerAddress`, `TxHashLink`, `getDebankProfileUrl` exist but aren't used in alpha chat

### Key Discoveries:

- Morpho SVG: All paths use `fill="white"` — `packages/web/public/protocols/morpho-blue.svg`
- Euler vault labels JSON available at `wgenie-webapp/src/fusion/markets/euler-v2/vault-labels/BASE_MAINNET_8453_VAULT_DATA.json` (and other chains)
- Morpho `getBalances()` already calls `idToMarketParams` which returns `[loanToken, collateralToken, ...]` — but doesn't return collateral info to consumer (`packages/sdk/src/markets/morpho/Morpho.ts:110-139`)
- `MarketPosition` type has no `label` field: `packages/mastra/src/tools/alpha/types.ts:37-46`
- `BlockExplorerAddress` is at `packages/web/src/components/ui/block-explorer-address.tsx` — needs `chainId` + `address`
- `TxHashLink` is at `packages/web/src/activity/components/tx-hash-link.tsx` — needs `txHash` + `chainId`

## Desired End State

1. Protocol icons display in rounded squares with background color for contrast (Morpho white logo visible on dark bg)
2. Morpho market positions show "COLLATERAL/LOAN" labels (e.g., "WETH/USDC")
3. Euler market positions show vault name labels (e.g., "Euler Base USDC")
4. Unchanged balance rows (`$0.00 → $0.00`) are hidden in simulation comparison
5. Tx hashes link to block explorer with copy button
6. Storybook defaults to dark theme
7. Agent persona is professional Portfolio Manager — no casual filler, finance-fluent language
8. `/demo-alpha` slash command adaptively exercises the full flow using real on-chain state

### Verification:
- Run `/demo-alpha` — it opens Storybook, reads live balances, plans a rebalancing strategy, creates actions, executes transactions, and reports UX quality
- Chat renders in dark theme
- Protocol icons have colored square backgrounds
- Market positions show descriptive labels
- Simulation hides unchanged rows
- Tx hashes link to block explorer
- Agent speaks like a professional PM

## What We're NOT Doing

- Not modifying the SDK's `MarketSubstrateBalance` interface (label resolution stays in Mastra layer)
- Not adding new protocol icons beyond the existing three (Aave, Morpho, Euler)
- Not changing the execution flow (ExecuteActions 5-step flow is stable)
- Not adding address display components to agent text messages (that requires rich text rendering which the chat doesn't support yet — text is plain strings)
- Not writing deterministic Playwright test scripts — the `/demo-alpha` command adapts to live on-chain state

## Implementation Approach

Work bottom-up: quick UI fixes first (low risk, immediate visible improvement), then market label resolution (server-side data enrichment + component updates), then testing.

---

## Phase 1: Quick UI Fixes

### Overview

Apply low-risk visual improvements: dark theme default, protocol icon contrast, hide unchanged simulation rows, tx hash links.

### Changes Required:

#### 1. Storybook dark theme default

**File**: `packages/web/.storybook/preview.ts`
**Changes**: Change `defaultTheme: 'light'` to `defaultTheme: 'dark'`

```typescript
decorators: [
  withThemeByClassName({
    themes: {
      light: '',
      dark: 'dark',
    },
    defaultTheme: 'dark',
  }),
],
```

#### 2. Protocol icons in rounded squares with background

**File**: `packages/web/src/components/protocol-icon/protocol-icon.tsx`
**Changes**: Replace `<img>` with a container div that provides a colored background square.

The `PROTOCOL_ICONS` map needs a `bgColor` per protocol:
- Aave: `#2B2D3E` (dark purple)
- Morpho: `#2559FF` (Morpho blue — from webapp `protocol.ts`)
- Euler: `#1E1E2E` (dark)

```tsx
const PROTOCOL_ICONS: Record<string, { icon: string; label: string; bgColor: string }> = {
  'aave-v3': { icon: '/protocols/aave.svg', label: 'Aave V3', bgColor: '#2B2D3E' },
  morpho: { icon: '/protocols/morpho-blue.svg', label: 'Morpho', bgColor: '#2559FF' },
  'euler-v2': { icon: '/protocols/euler.svg', label: 'Euler V2', bgColor: '#1E1E2E' },
  // display-name keys
  'Aave V3': { icon: '/protocols/aave.svg', label: 'Aave V3', bgColor: '#2B2D3E' },
  'Aave V3 Lido': { icon: '/protocols/aave.svg', label: 'Aave V3 Lido', bgColor: '#2B2D3E' },
  'Morpho': { icon: '/protocols/morpho-blue.svg', label: 'Morpho', bgColor: '#2559FF' },
  'Euler V2': { icon: '/protocols/euler.svg', label: 'Euler V2', bgColor: '#1E1E2E' },
};

export function ProtocolIcon({ protocol, className }: Props) {
  const config = PROTOCOL_ICONS[protocol];
  if (!config) {
    return (
      <div className={cn('w-5 h-5 rounded bg-muted text-xs text-muted-foreground flex items-center justify-center', className)}>
        {protocol.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className={cn('rounded flex items-center justify-center p-0.5', className)}
      style={{ backgroundColor: config.bgColor }}
      title={config.label}
    >
      <img
        src={config.icon}
        alt={config.label}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
```

Note: The `className` sizing (e.g., `w-5 h-5`, `w-4 h-4`) now applies to the outer container div. The inner `<img>` fills it. The `p-0.5` provides slight padding inside the square.

#### 3. Filter unchanged rows in SimulationBalanceComparison

**File**: `packages/web/src/vault-details/components/simulation-balance-comparison.tsx`
**Changes**:

In the `AssetRow` rendering section, filter out assets where both balance and USD value are unchanged:

```tsx
{/* Unallocated Tokens */}
{hasAssets && (() => {
  const changedAssets = before.assets.filter((beforeAsset) => {
    const afterAsset = afterAssetMap.get(beforeAsset.address) ?? beforeAsset;
    return beforeAsset.balanceFormatted !== afterAsset.balanceFormatted
      || beforeAsset.valueUsd !== afterAsset.valueUsd;
  });
  if (changedAssets.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Unallocated Tokens
      </p>
      <div>
        {changedAssets.map((beforeAsset) => {
          const afterAsset = afterAssetMap.get(beforeAsset.address) ?? beforeAsset;
          return (
            <AssetRow key={beforeAsset.address} before={beforeAsset} after={afterAsset} chainId={chainId} />
          );
        })}
      </div>
    </div>
  );
})()}
```

Similarly for market positions, filter out positions where supply/borrow/total are unchanged:

In `MarketSection`, filter positions:
```tsx
function MarketSection({ beforeMarket, afterMarket, chainId }: { beforeMarket: Market; afterMarket: Market; chainId: number }) {
  // Filter to only changed positions
  const changedPositionIndices = beforeMarket.positions
    .map((beforePos, i) => {
      const afterPos = afterMarket.positions[i] ?? beforePos;
      const hasChange =
        beforePos.supplyFormatted !== afterPos.supplyFormatted ||
        beforePos.borrowFormatted !== afterPos.borrowFormatted ||
        beforePos.totalValueUsd !== afterPos.totalValueUsd;
      return hasChange ? i : -1;
    })
    .filter((i) => i !== -1);

  // Also check if market total changed
  const marketTotalChanged = beforeMarket.totalValueUsd !== afterMarket.totalValueUsd;

  if (changedPositionIndices.length === 0 && !marketTotalChanged) return null;

  return (
    <div className="space-y-1">
      {/* ... header same as before ... */}
      <div>
        {changedPositionIndices.map((i) => {
          const beforePos = beforeMarket.positions[i];
          const afterPos = afterMarket.positions[i] ?? beforePos;
          return (
            <PositionRow key={`${beforeMarket.marketId}-${i}`} before={beforePos} after={afterPos} chainId={chainId} />
          );
        })}
      </div>
    </div>
  );
}
```

#### 4. Tx hash links in SimulationResult and ExecuteActions

**File**: `packages/web/src/vault-details/components/simulation-result.tsx`
**Changes**: Replace plain text tx hash with `TxHashLink` component.

Add import:
```tsx
import { TxHashLink } from '@/activity/components/tx-hash-link';
```

Replace lines 212-214:
```tsx
<p className="text-xs text-muted-foreground mt-1 font-mono">
  tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
</p>
```

With:
```tsx
<div className="mt-1">
  <TxHashLink txHash={txHash} chainId={chainId} />
</div>
```

**File**: `packages/web/src/vault-details/components/execute-actions.tsx`
**Changes**: Same replacement.

Add import:
```tsx
import { TxHashLink } from '@/activity/components/tx-hash-link';
```

Replace lines 413-414:
```tsx
<p className="text-xs text-muted-foreground mt-1 font-mono">
  tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
</p>
```

With:
```tsx
<div className="mt-1">
  <TxHashLink txHash={txHash} chainId={chainId} />
</div>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] SVG files unchanged at `packages/web/public/protocols/`

#### Manual Verification:
- [ ] Storybook opens in dark theme by default
- [ ] Protocol icons have colored square backgrounds — Morpho logo visible on blue square
- [ ] After creating an action with simulation, only changed balance rows appear (no $0.00 → $0.00)
- [ ] After executing a transaction, tx hash is a clickable link to block explorer with copy button

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Market Labels

### Overview

Add human-readable market labels to positions: Morpho shows "WETH/USDC" (collateral/loan pair), Euler shows vault name from JSON data.

### Changes Required:

#### 1. Add `label` field to MarketPosition type

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add optional `label` field to `MarketPosition`:

```typescript
export interface MarketPosition {
  substrate: string;
  underlyingToken: string;
  underlyingSymbol: string;
  label?: string;  // Human-readable label: "WETH/USDC" for Morpho, "Euler Base USDC" for Euler
  supplyFormatted: string;
  supplyValueUsd: string;
  borrowFormatted: string;
  borrowValueUsd: string;
  totalValueUsd: string;
}
```

Also add `label` to the `BalanceSnapshot` market positions (same shape — used by SimulationBalanceComparison).

#### 2. Copy Euler vault-label JSON files to Mastra

Copy from `wgenie-webapp/src/fusion/markets/euler-v2/vault-labels/` to `packages/mastra/src/tools/alpha/euler-vault-labels/`:
- `BASE_MAINNET_8453_VAULT_DATA.json`
- `ETHEREUM_MAINNET_1_VAULT_DATA.json`
- `ARBITRUM_MAINNET_42161_VAULT_DATA.json`

#### 3. Add label resolution in readVaultBalances

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts`
**Changes**:

**For Morpho**: After getting balances from `morpho.getBalances()`, do an additional multicall to resolve the collateral token symbol for each Morpho position:

```typescript
// After morpho.getBalances()
if (marketName === 'MORPHO') {
  const morpho = new Morpho(plasmaVault);
  balances = await morpho.getBalances();

  // Resolve collateral token symbols for labels
  const morphoMarketIds = balances.map(b => b.substrate);
  const morphoAddress = MORPHO_ADDRESS[plasmaVault.chainId];

  if (morphoAddress && morphoMarketIds.length > 0) {
    // Get market params to find collateral tokens
    const marketParamsResults = await publicClient.multicall({
      contracts: morphoMarketIds.map((marketId) => ({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: 'idToMarketParams' as const,
        args: [marketId],
      })),
      allowFailure: true,
    });

    const collateralTokens = marketParamsResults.map(r => {
      if (r.status === 'success') {
        const result = r.result as readonly [Address, Address, Address, Address, bigint];
        return result[1]; // collateralToken
      }
      return '0x0000000000000000000000000000000000000000' as Address;
    });

    // Get collateral token symbols
    const collateralSymbolResults = await publicClient.multicall({
      contracts: collateralTokens.map(addr => ({
        address: addr,
        abi: erc20Abi,
        functionName: 'symbol' as const,
      })),
      allowFailure: true,
    });

    morphoCollateralSymbols = collateralSymbolResults.map(r =>
      r.status === 'success' ? (r.result as string) : '???'
    );
  }
}
```

Then when building positions, add the label:
```typescript
positions = balances.map((b, i) => ({
  // ... existing fields ...
  label: morphoCollateralSymbols
    ? `${morphoCollateralSymbols[i]}/${b.underlyingTokenSymbol}`
    : undefined,
}));
```

**For Euler**: Load JSON data and look up by vault address:

```typescript
import eulerVaultLabelsBase from './euler-vault-labels/BASE_MAINNET_8453_VAULT_DATA.json';
import eulerVaultLabelsEthereum from './euler-vault-labels/ETHEREUM_MAINNET_1_VAULT_DATA.json';
import eulerVaultLabelsArbitrum from './euler-vault-labels/ARBITRUM_MAINNET_42161_VAULT_DATA.json';

const EULER_VAULT_LABELS: Record<number, Record<string, { name: string }>> = {
  1: eulerVaultLabelsEthereum,
  42161: eulerVaultLabelsArbitrum,
  8453: eulerVaultLabelsBase,
};

function getEulerVaultLabel(substrate: Hex, chainId: number): string | undefined {
  const labels = EULER_VAULT_LABELS[chainId];
  if (!labels) return undefined;
  // substrate encodes euler vault address — extract it
  const eulerVaultAddress = substrateToAddress(substrate);
  if (!eulerVaultAddress) return undefined;
  // Case-insensitive lookup
  const entry = Object.entries(labels).find(
    ([addr]) => addr.toLowerCase() === eulerVaultAddress.toLowerCase()
  );
  return entry?.[1]?.name;
}
```

Then when building Euler positions:
```typescript
label: getEulerVaultLabel(b.substrate, publicClient.chain?.id ?? 0),
```

**Important note on Morpho ABI**: The Morpho contract ABI for `idToMarketParams` is already available in the SDK at `packages/sdk/src/markets/morpho/abi/morpho.abi.ts`. We need to import it in `readVaultBalances`:
```typescript
import { morphoAbi } from '@wgenie/fusion-sdk/markets/morpho/abi/morpho.abi';
```

If that import path doesn't work (SDK may not export it directly), we can define a minimal ABI inline:
```typescript
const morphoIdToMarketParamsAbi = [{
  type: 'function' as const,
  name: 'idToMarketParams' as const,
  inputs: [{ name: 'id', type: 'bytes32' }],
  outputs: [
    { name: 'loanToken', type: 'address' },
    { name: 'collateralToken', type: 'address' },
    { name: 'oracle', type: 'address' },
    { name: 'irm', type: 'address' },
    { name: 'lltv', type: 'uint256' },
  ],
  stateMutability: 'view' as const,
}] as const;
```

We also need the Morpho contract address per chain. Import from SDK:
```typescript
import { MORPHO_ADDRESS } from '@wgenie/fusion-sdk/markets/morpho/morpho.addresses';
```

Or check SDK exports and use the correct import path.

#### 4. Update output schema in getMarketBalancesTool

**File**: `packages/mastra/src/tools/alpha/get-market-balances.ts`
**Changes**: Add `label` to the `marketPositionSchema`:

```typescript
const marketPositionSchema = z.object({
  substrate: z.string(),
  underlyingToken: z.string(),
  underlyingSymbol: z.string(),
  label: z.string().optional().describe('Human-readable label: "WETH/USDC" for Morpho, vault name for Euler'),
  supplyFormatted: z.string(),
  // ... rest unchanged
});
```

#### 5. Display labels in MarketBalancesList

**File**: `packages/web/src/vault-details/components/market-balances-list.tsx`
**Changes**: In `PositionRow`, display the label when available:

```tsx
function PositionRow({ position, chainId }: { position: MarketPosition; chainId: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <TokenIcon chainId={chainId} address={position.underlyingToken as Address} className="w-8 h-8" />
        <div>
          <p className="text-sm font-medium">
            {position.label ?? position.underlyingSymbol}
          </p>
          {position.label && (
            <p className="text-xs text-muted-foreground">{position.underlyingSymbol}</p>
          )}
          {/* ... supply/borrow display unchanged ... */}
        </div>
      </div>
      {/* ... right side unchanged ... */}
    </div>
  );
}
```

#### 6. Display labels in SimulationBalanceComparison

**File**: `packages/web/src/vault-details/components/simulation-balance-comparison.tsx`
**Changes**: Same pattern in `PositionRow` — show `label` as primary text when available.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles in both packages: `cd packages/mastra && npx tsc --noEmit` and `cd packages/web && npx tsc --noEmit`
- [ ] Euler vault label JSON files exist in `packages/mastra/src/tools/alpha/euler-vault-labels/`

#### Manual Verification:
- [ ] "Get balances" for the Base USDC vault shows Morpho positions with "COLLATERAL/LOAN" format
- [ ] Euler positions show human-readable names (e.g., "Euler Base USDC")
- [ ] Aave positions still show underlying symbol only
- [ ] Labels appear in both MarketBalancesList and SimulationBalanceComparison

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Agent Persona & Text Formatting

### Overview

Rewrite the agent persona from casual assistant to professional Portfolio Manager. The user is a Portfolio Manager — the agent should speak to them as a peer: concise, precise, finance-fluent. Also ensure human-readable numbers in text.

### Changes Required:

#### 1. Rewrite agent instructions opening

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Replace the opening paragraph and add formatting/tone rules.

Replace:
```
You are an Alpha Agent for wGenie Fusion Plasma Vaults. You help users understand their vault's holdings (both unallocated tokens and DeFi market positions) and build a batch of fuse actions to execute.
```

With:
```
You are Alpha — a DeFi Portfolio Management assistant for wGenie Fusion Plasma Vaults.

## TONE & STYLE

You are speaking with a Portfolio Manager. Communicate like a professional peer:
- Be direct, precise, and finance-fluent. No filler, no pleasantries, no "Sure!" or "Great question!"
- Use proper financial terminology: "positions", "allocations", "exposure", "rebalance", "drawdown"
- When referencing amounts, ALWAYS use human-readable format with token symbol: "1,250.00 USDC", "0.5 WETH" — NEVER raw integers like "1250000000"
- Reference getMarketBalancesTool's balanceFormatted / supplyFormatted values — those are already human-readable
- Present actions as strategic operations: "Reallocating 500 USDC from Aave V3 to Morpho WETH/USDC" not "Moving money"
- When simulation shows results, comment briefly on the impact: net change, risk implications if relevant
- Keep every text response to 1–2 sentences max when tool output is displayed alongside
```

#### 2. Add formatting rule to IMPORTANT RULES

Add to the existing IMPORTANT RULES section:
```
- When mentioning token amounts in text, ALWAYS use human-readable decimal format with token symbol (e.g., "1,000 USDC" not "1000000000"). Use the balanceFormatted/supplyFormatted values from tool results.
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`

#### Manual Verification:
- [ ] Agent uses professional Portfolio Manager language
- [ ] Agent text mentions amounts in human-readable format
- [ ] No casual filler phrases

---

## Phase 4: Create `/demo-alpha` Slash Command

### Overview

Create a slash command that uses Playwright MCP to drive an adaptive, live demo of the Alpha Agent through the Storybook chat UI. The command acts as a Portfolio Manager conducting a realistic demo session — it reads real vault state, makes strategic decisions based on actual positions, and executes real transactions. Designed for client demos.

### Changes Required:

#### 1. Create the slash command file

**File**: `.claude/commands/demo-alpha.md`

```markdown
---
description: Run an adaptive Alpha Agent demo via Playwright MCP against Storybook chat UI. Reads live vault state, makes strategic rebalancing decisions, executes real transactions. For client demos.
model: opus
---

# Alpha Agent Demo

You are running an interactive demo of the wGenie Fusion Alpha Agent for a client presentation. You will use Playwright MCP to interact with the Alpha Agent chat UI in Storybook and demonstrate professional-grade vault portfolio management.

## Context

- **Storybook URL**: `http://localhost:6007/iframe.html?globals=&id=vault-details-vaultalpha--base-usdc-vault&viewMode=story`
- **Vault**: `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on Base (chainId 8453)
- **Alpha account**: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`
- **Caller address for simulation**: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`

## Pre-requisites

Before starting, verify these are running:
1. Mastra dev server: `cd packages/mastra && pnpm dev` (port 4111)
2. Storybook: `cd packages/web && pnpm storybook` (port 6007)

If not running, start them as background tasks.

## Demo Flow

You are an autonomous Portfolio Manager conducting a demo. Adapt your actions based on REAL vault state — do NOT use hardcoded amounts or markets. The vault is live on-chain; balances change.

### Step 1: Navigate & Visual Check
1. Open the Storybook URL using Playwright MCP
2. Take a screenshot — verify dark theme, chat input visible
3. Report to the user what you see

### Step 2: Portfolio Review
1. Type into the chat: "Review my current portfolio positions and allocations"
2. Wait for the agent response + tool output to render
3. Take a screenshot of the balances display
4. **Read and analyze the real data**: Note which protocols have positions (Aave V3, Morpho, Euler), what tokens, what USD values, what's unallocated
5. Report the portfolio state to the user

### Step 3: Strategic Rebalancing (Adaptive)
Based on the REAL portfolio state from Step 2, design a rebalancing strategy. Choose ONE of these patterns depending on what you see:

**If multiple markets have positions:**
- Withdraw a small amount from the largest position
- Supply it to the smallest position (diversification play)
- Narrative: "Rebalancing to reduce concentration risk"

**If most capital is in one protocol:**
- Withdraw a portion and split across 2 other protocols
- Narrative: "Diversifying across lending protocols to reduce single-protocol exposure"

**If there's significant unallocated capital:**
- Supply unallocated tokens to 2-3 different markets
- Narrative: "Deploying idle capital to maximize yield"

**If positions are already well-balanced:**
- Withdraw from one, supply to another (rotation)
- Narrative: "Rotating exposure from [A] to [B] based on current rate environment"

Use SMALL amounts (0.001–0.01 range for USDC, proportionally smaller for other tokens) to avoid significant portfolio impact.

### Step 4: Execute Actions
1. Type into the chat the first action (e.g., "Withdraw 0.005 USDC from Aave V3")
2. Wait for simulation result, take screenshot
3. Verify: simulation card shows, changed balances only (no $0.00 → $0.00), protocol icons with colored squares
4. Type the second action
5. Wait for simulation, take screenshot
6. Continue until all planned actions are created
7. Type: "Execute all pending actions"
8. Wait for ExecuteActions component to render
9. Take screenshot of the execution flow
10. The Storybook wallet auto-signs — wait for transaction confirmation
11. Take screenshot of the confirmed transaction with tx hash link

### Step 5: Post-Execution Verification
1. Type: "Show me the updated portfolio"
2. Wait for fresh balances
3. Take screenshot
4. Compare with Step 2 — confirm the rebalancing took effect
5. Report the before/after to the user

### Step 6: UX Quality Report
After the demo, report to the user:
- Did protocol icons render with colored backgrounds?
- Did market labels show descriptive names (Morpho: "COLLATERAL/LOAN", Euler: vault name)?
- Were unchanged balance rows hidden in simulation?
- Did tx hash link to block explorer?
- Was the agent professional in tone (no casual filler)?
- Any bugs, glitches, or UX issues noticed?

## Interaction Guidelines

- **Use Playwright MCP** (`browser_snapshot`, `browser_type`, `browser_click`, `browser_take_screenshot`) for all browser interactions
- **Type messages** into the chat input and press Enter to submit
- **Wait for responses** — the agent may take 5-15 seconds for tool calls (especially simulation with Anvil fork)
- **Take screenshots** at key moments for the demo record
- **Be adaptive** — if a transaction fails or the agent gives unexpected output, adjust your approach rather than retrying the same thing
- **Report everything** back to the user — they're watching the demo and want commentary

## What to Look For (UX Checklist)

- [ ] Dark theme active
- [ ] Protocol icons in colored rounded squares (Morpho blue, Aave dark purple, Euler dark)
- [ ] Market positions show labels (not just "USDC" but "WETH/USDC" for Morpho, vault names for Euler)
- [ ] Simulation hides unchanged rows
- [ ] Tx hash is a clickable link with copy button
- [ ] Agent uses professional PM language
- [ ] Agent uses human-readable numbers
- [ ] No console errors
- [ ] Execution completes successfully
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists at `.claude/commands/demo-alpha.md`
- [ ] Command appears in `/help` output

#### Manual Verification:
- [ ] Running `/demo-alpha` launches the adaptive demo flow
- [ ] Demo successfully reads real balances, plans a strategy, executes transactions
- [ ] UX checklist items are verified during the demo

**Implementation Note**: After creating the command, run it once to verify the full flow works end-to-end. Document any issues found.

---

## Testing Strategy

### Unit Tests:
- None required — existing patterns don't have unit tests for chat components

### Integration Tests:
- The `/demo-alpha` slash command IS the integration test — it adaptively exercises the entire stack

### Manual Testing Steps:
1. Run `/demo-alpha` — it handles everything adaptively
2. Review screenshots and UX report generated by the demo
3. Fix any issues found, re-run

## Performance Considerations

- Morpho label resolution adds one additional multicall per market (collateral token symbols) — ~1-2ms on RPC
- Euler label resolution is a static JSON lookup — zero latency
- No impact on simulation or execution performance

## References

- Previous FSN-0037 plan: `thoughts/shared/plans/2026-02-15-FSN-0037-refine-alpha-agent-chat.md`
- Previous FSN-0038 borrowing plan: `thoughts/shared/plans/2026-02-15-FSN-0038-alpha-borrowing.md`
- Protocol icon component: `packages/web/src/components/protocol-icon/protocol-icon.tsx`
- Morpho SVG (white): `packages/web/public/protocols/morpho-blue.svg`
- Simulation comparison: `packages/web/src/vault-details/components/simulation-balance-comparison.tsx`
- readVaultBalances: `packages/mastra/src/tools/alpha/read-vault-balances.ts`
- Webapp Morpho market label: `wgenie-webapp/src/fusion/markets/morpho/components/morpho-market-label.tsx`
- Webapp Euler vault labels: `wgenie-webapp/src/fusion/markets/euler-v2/vault-labels/`
- TxHashLink: `packages/web/src/activity/components/tx-hash-link.tsx`
- BlockExplorerAddress: `packages/web/src/components/ui/block-explorer-address.tsx`
