# FSN-0037: Refine Alpha Agent Chat — Implementation Plan

## Overview

Improve the Alpha Agent chat experience by integrating automatic Anvil fork simulation into every action creation, adding protocol/token icons to all chat components, improving market labels, and making agent responses brief when tools return structured data.

## Current State Analysis

- **MarketBalancesList**: Uses plain-text circles (`{symbol.slice(0,3)}`) instead of real token icons; protocol names rendered as uppercase text with no icons
- **PendingActionsList**: Has protocol label mapping but no protocol icons, no token icons
- **SimulationBalanceComparison**: Same placeholder circles, plain-text protocol names
- **Simulation**: Separate tool call (`simulatePendingActionsTool`), has `eth_call` fallback, requires explicit user request
- **Agent**: No instruction to keep messages brief when tools return JSON data
- **Protocol icons**: Available in `wgenie-webapp/public/protocols/` but not in monorepo `packages/web`
- **TokenIcon component**: Already exists at `packages/web/src/components/token-icon/token-icon.tsx`

### Key Discoveries:
- Protocol SVGs available: `aave.svg`, `morpho-blue.svg`, `euler.svg` — must copy to monorepo
- TokenIcon component has 3-tier fallback (API → create API → placeholder with symbol) — works for all tokens
- The `callerAddress` (with ALPHA_ROLE) is needed for simulation — agent must ask for it early
- Action creation tools already accept `vaultAddress` + `chainId` — adding simulation params is clean

## Desired End State

1. Every action creation (supply/withdraw/borrow/repay) automatically runs Anvil fork simulation of ALL accumulated pending actions + the new one
2. All chat components use proper protocol icons (SVG) and token icons (from wGenie asset API)
3. Market labels show "Aave V3 USDC" / "Morpho WETH/USDC" style formatting
4. Agent responses are brief when tool output already displays structured data
5. No `eth_call` fallback — Anvil simulation only
6. `simulatePendingActionsTool` removed (simulation built into action tools)

### Verification:
- Open chat at `http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/alpha`
- Create actions (supply, withdraw) → each shows protocol/token icons + simulation balance comparison
- Transaction execution succeeds when wallet is connected
- No duplicate information between agent text and tool UI output

## What We're NOT Doing

- Not changing the `ExecuteActions` component (5-step wallet flow) — it works correctly
- Not adding new protocols beyond Aave V3, Morpho, Euler V2
- Not changing the `getMarketBalancesTool` output structure (backward compatible)
- Not modifying the `displayPendingActionsTool` — it still serves its purpose for listing all actions
- Not adding market labels with external links (no Aave/Morpho app links in chat)

## Implementation Approach

The changes touch both Mastra (server-side tools) and Next.js (React components). We work bottom-up: infrastructure first (icons), then component improvements, then the big simulation integration, then agent instructions, and finally browser testing.

---

## Phase 1: Protocol Icons Infrastructure

### Overview
Copy protocol SVG icons from `wgenie-webapp` to the monorepo and create a `ProtocolIcon` component.

### Changes Required:

#### 1. Copy protocol SVGs

Copy these files from `/Users/kuba/wgenie-labs/wgenie-webapp/public/protocols/` to `/Users/kuba/wgenie-labs/wgenie-monorepo/packages/web/public/protocols/`:
- `aave.svg`
- `morpho-blue.svg`
- `euler.svg`

#### 2. Create ProtocolIcon component

**File**: `packages/web/src/components/protocol-icon/protocol-icon.tsx`

```tsx
import { cn } from '@/lib/utils';

const PROTOCOL_ICONS: Record<string, { icon: string; label: string }> = {
  'aave-v3': { icon: '/protocols/aave.svg', label: 'Aave V3' },
  morpho: { icon: '/protocols/morpho-blue.svg', label: 'Morpho' },
  'euler-v2': { icon: '/protocols/euler.svg', label: 'Euler V2' },
};

interface Props {
  protocol: string;
  className?: string;
}

export function ProtocolIcon({ protocol, className }: Props) {
  const config = PROTOCOL_ICONS[protocol];
  if (!config) {
    return (
      <div className={cn('w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground flex items-center justify-center', className)}>
        {protocol.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={config.icon}
      alt={config.label}
      title={config.label}
      className={cn('w-5 h-5 rounded-full', className)}
    />
  );
}

export function getProtocolLabel(protocol: string): string {
  return PROTOCOL_ICONS[protocol]?.label ?? protocol;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] SVG files exist at `packages/web/public/protocols/aave.svg`, `morpho-blue.svg`, `euler.svg`

#### Manual Verification:
- [ ] Protocol icons render at correct size in browser

---

## Phase 2: Enhance MarketBalancesList with Icons

### Overview
Replace placeholder circles with real token icons and add protocol icons to market sections.

### Changes Required:

**File**: `packages/web/src/vault-details/components/market-balances-list.tsx`

#### 1. Add imports
```tsx
import { TokenIcon } from '@/components/token-icon/token-icon';
import { ProtocolIcon, getProtocolLabel } from '@/components/protocol-icon/protocol-icon';
```

#### 2. Add `chainId` to Props and threading
The component needs `chainId` to pass to `TokenIcon`. Add it to `Props` interface. Thread it through the `AlphaToolRenderer` from the vault page context.

#### 3. Replace AssetRow placeholder with TokenIcon
Replace the `w-8 h-8 rounded-full bg-primary/10` div containing `{asset.symbol.slice(0, 3)}` with:
```tsx
<TokenIcon chainId={chainId} address={asset.address as Address} className="w-8 h-8" />
```

#### 4. Replace PositionRow placeholder with TokenIcon
Same replacement for market position rows — use `position.underlyingToken` as address.

#### 5. Replace MarketCard protocol text with icon + label
Replace the plain `{market.protocol}` uppercase text with:
```tsx
<div className="flex items-center gap-1.5">
  <ProtocolIcon protocol={market.protocol} className="w-4 h-4" />
  <p className="text-xs font-semibold text-muted-foreground tracking-wide">
    {getProtocolLabel(market.protocol)}
  </p>
</div>
```

#### 6. Update AlphaToolRenderer to pass chainId
**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`

Add `chainId` prop to `ToolPartProps` and pass it through from `VaultAlpha`.

**File**: `packages/web/src/vault-details/components/vault-alpha.tsx`

Pass `chainId` to `AlphaToolRenderer`.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Token icons appear (or symbol placeholders) in MarketBalancesList
- [ ] Protocol icons appear in market section headers
- [ ] Layout is clean and aligned

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Enhance PendingActionsList with Icons

### Overview
Add protocol icons to pending action items.

### Changes Required:

**File**: `packages/web/src/vault-details/components/pending-actions-list.tsx`

#### 1. Add ProtocolIcon import
```tsx
import { ProtocolIcon, getProtocolLabel } from '@/components/protocol-icon/protocol-icon';
```

#### 2. Replace action type icon area with protocol icon + action icon
In `ActionItem`, replace the `w-8 h-8 rounded-md bg-primary/10` wrapper with a layout showing protocol icon:
```tsx
<div className="flex items-center gap-2">
  <ProtocolIcon protocol={action.protocol} className="w-6 h-6" />
  <div>
    <p className="text-sm font-medium">{action.description}</p>
    <p className="text-xs text-muted-foreground">
      {getProtocolLabel(action.protocol)} &middot; {action.actionType}
    </p>
  </div>
</div>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Protocol icons render next to each pending action

---

## Phase 4: Enhance SimulationBalanceComparison with Icons

### Overview
Add token icons and protocol icons to the balance comparison component.

### Changes Required:

**File**: `packages/web/src/vault-details/components/simulation-balance-comparison.tsx`

#### 1. Add imports
```tsx
import { TokenIcon } from '@/components/token-icon/token-icon';
import { ProtocolIcon, getProtocolLabel } from '@/components/protocol-icon/protocol-icon';
```

#### 2. Add `chainId` to Props
```tsx
interface Props {
  before: BalanceSnapshot;
  after: BalanceSnapshot;
  chainId: number;
}
```

#### 3. Replace AssetRow placeholder with TokenIcon
Replace the `w-8 h-8 rounded-full bg-primary/10` div with `TokenIcon`, using `before.address` and `chainId`.

#### 4. Replace PositionRow placeholder with TokenIcon
Use `before.underlyingToken` as address.

#### 5. Replace MarketSection protocol text with icon + label
Replace `{beforeMarket.protocol}` with ProtocolIcon + `getProtocolLabel()`.

#### 6. Update SimulationResult to pass chainId
**File**: `packages/web/src/vault-details/components/simulation-result.tsx`

Pass `chainId` to `SimulationBalanceComparison`.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Token icons and protocol icons appear in simulation balance comparison

---

## Phase 5: Integrate Simulation into Action Creation Tools

### Overview
This is the core change. Each action creation tool automatically runs Anvil fork simulation of ALL pending actions (existing + newly created). Remove `simulatePendingActionsTool`. Remove `eth_call` fallback.

### Changes Required:

#### 1. Extract shared simulation helper

**File**: `packages/mastra/src/tools/alpha/simulate-on-fork.ts` (NEW)

Extract the Anvil fork simulation logic from `simulatePendingActionsTool` into a reusable function:

```typescript
import { type Address, type Hex } from 'viem';
import { SUPPORTED_CHAINS } from '../plasma-vault/utils/viem-clients';
import { readVaultBalances } from './read-vault-balances';
import { spawnAnvilFork } from './anvil-fork';
import type { BalanceSnapshot } from './types';

const plasmaVaultExecuteAbi = [...]; // Same ABI as before

export interface SimulationInput {
  vaultAddress: string;
  chainId: number;
  callerAddress: string;
  flatFuseActions: Array<{ fuse: string; data: string }>;
}

export interface SimulationOutput {
  success: boolean;
  message: string;
  balancesBefore?: BalanceSnapshot;
  balancesAfter?: BalanceSnapshot;
  error?: string;
}

export async function simulateOnFork(input: SimulationInput): Promise<SimulationOutput> {
  // Spawn Anvil fork
  // Read balances before
  // Impersonate caller + execute
  // Read balances after
  // NO eth_call fallback — just Anvil
  // Always kill fork in finally
}
```

#### 2. Create new output type

**File**: `packages/mastra/src/tools/alpha/types.ts`

Add new `ActionWithSimulationOutput` type:

```typescript
export type ActionWithSimulationOutput = {
  type: 'action-with-simulation';
  // Action info
  success: boolean;
  protocol: 'aave-v3' | 'morpho' | 'euler-v2';
  actionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
  description: string;
  fuseActions: Array<{ fuse: string; data: string }>;
  error?: string;
  // Simulation of ALL pending actions (existing + new)
  simulation?: {
    success: boolean;
    message: string;
    actionsCount: number;
    fuseActionsCount: number;
    balancesBefore?: BalanceSnapshot;
    balancesAfter?: BalanceSnapshot;
    error?: string;
  };
};
```

Add to `AlphaToolOutput` union.

#### 3. Modify action creation tools

Modify all three tools (`create-aave-v3-action.ts`, `create-morpho-action.ts`, `create-euler-v2-action.ts`):

**Input schema additions:**
```typescript
callerAddress: z.string().optional().describe('Caller address with ALPHA_ROLE for simulation'),
existingPendingActions: z.array(z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
})).optional().describe('Existing pending actions from working memory for combined simulation'),
```

**Output schema change:** Return `ActionWithSimulationOutput` instead of current output.

**Execute logic addition:** After creating the action, if `callerAddress` is provided:
1. Combine `existingPendingActions.flatMap(a => a.fuseActions)` + new `fuseActions`
2. Call `simulateOnFork()` with the combined fuse actions
3. Include simulation results in output

If `callerAddress` is not provided, return action without simulation (simulation field omitted).

#### 4. Create ActionWithSimulation React component

**File**: `packages/web/src/vault-details/components/action-with-simulation.tsx` (NEW)

Renders the combined action + simulation view:

```tsx
// Header: action success/failure with protocol icon
// Action summary: "Aave V3 Supply 1000 USDC" with protocol icon
// If simulation exists and succeeded: SimulationBalanceComparison
// If simulation failed: error message
```

#### 5. Remove simulatePendingActionsTool

- Remove export from `packages/mastra/src/tools/alpha/index.ts`
- Remove from agent's tools in `packages/mastra/src/agents/alpha-agent.ts`
- Delete `packages/mastra/src/tools/alpha/simulate-pending-actions.ts`
- Remove `SimulationResultOutput` from types.ts (keep `BalanceSnapshot` — still used)
- Remove `SimulationResult` component import from `alpha-tool-renderer.tsx`
- Keep the `SimulationResult` component file for now (it's used by the execute flow and may be referenced)

Actually — the `SimulationResult` component also has an "Execute" button built in. We should keep it only if ExecuteActions doesn't cover execution. Looking at the code: `ExecuteActions` has the full 5-step flow, and `SimulationResult` has a simpler connect → execute flow. Since we're removing the standalone simulation tool, `SimulationResult` is no longer reachable via tools. We can remove it from the renderer mapping.

#### 6. Update alpha-tool-renderer.tsx

- Add case for `'action-with-simulation'` → `ActionWithSimulation` component
- Remove case for `'simulation-result'` → `SimulationResult`
- Pass `chainId` (already added in Phase 2)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles in both packages: `cd packages/mastra && npx tsc --noEmit` and `cd packages/web && npx tsc --noEmit`
- [ ] Mastra dev server starts: `pnpm dev:mastra`

#### Manual Verification:
- [ ] Creating an action in chat triggers automatic simulation
- [ ] Balance comparison shows up with proper icons after action creation
- [ ] Multiple actions show cumulative simulation (all pending + new)
- [ ] Execution still works via `executePendingActionsTool`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Update Agent Instructions

### Overview
Update the Alpha Agent instructions to reflect the new auto-simulation workflow and add the brief messages rule.

### Changes Required:

**File**: `packages/mastra/src/agents/alpha-agent.ts`

#### 1. Add brief response rule
Add to IMPORTANT RULES section:
```
- When a tool returns structured data (JSON output displayed as a UI component), keep your text response BRIEF — just a short summary like "Added supply action" or "Here are the vault balances". Do NOT repeat or describe the data that the tool output already shows in the UI.
```

#### 2. Update WORKFLOW section
Add step after creating actions:
```
3. **Create actions with simulation**: Use the appropriate SDK tool with callerAddress and existingPendingActions from your working memory. The tool will automatically simulate ALL pending actions (existing + new) on an Anvil fork and return balance comparisons.
```

#### 3. Add callerAddress requirement
Add to workflow:
```
Before creating the first action, ask the user for their wallet address (the caller address with ALPHA_ROLE on the vault). Store it in the conversation for use in all subsequent action creation calls.
```

#### 4. Remove SIMULATION section
Remove lines 133-152 (the standalone simulation instructions). Replace with brief note:
```
## SIMULATION
Simulation is automatic — every time you create an action, the tool simulates ALL pending actions on an Anvil fork and returns a before/after balance comparison. You do NOT need to call a separate simulation tool.
If the user explicitly asks to simulate without creating a new action, use displayPendingActionsTool to show current actions — the simulation was already run when actions were created.
```

#### 5. Remove simulatePendingActionsTool from tools object
Remove `simulatePendingActionsTool` from the tools registration.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`

#### Manual Verification:
- [ ] Agent asks for wallet address before first action
- [ ] Agent keeps text brief when tools return structured data
- [ ] Agent no longer references standalone simulation

---

## Phase 7: Browser Testing (Storybook + Mastra)

### Overview
Test the full flow using Storybook for the web components and Mastra dev server for agent interaction. Use Playwright MCP for browser testing.

### Pre-requisites
- Run Storybook from web package: `cd packages/web && pnpm storybook` (port 6007)
- Run Mastra dev server: `pnpm dev:mastra`

### Storybook Testing
- URL: `http://localhost:6007/iframe.html?globals=&id=vault-details-vaultalpha--base-usdc-vault`
- The VaultAlpha story uses `WalletDecorator` for wallet provider
- Chat connects to Mastra at `/api/vaults/${chainId}/${vaultAddress}/chat`

### Test Cases:

1. **Get vault balances**: Ask "Show me vault balances" → verify protocol icons, token icons, market labels
2. **Supply to Aave V3**: "Supply 0.001 USDC to Aave V3" → verify:
   - Action created with protocol icon
   - Simulation runs automatically
   - Balance comparison shows with token icons
3. **Supply to Morpho**: "Supply 0.001 USDC to a Morpho market" → verify same as above
4. **Withdraw from market**: "Withdraw 0.001 USDC from Aave V3" → verify simulation shows decreased position
5. **Execute**: "Execute the pending actions" → verify ExecuteActions component renders with proper flow
6. **Agent brevity**: Verify agent text is short when tool output is displayed
7. **Single action test**: Test each action type individually to identify specific error sources
8. **Check simulation correctness**: Verify balance changes make sense mathematically

### Vault & Account:
- Vault: `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on Base (chainId 8453)
- Alpha account: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`
- Storybook URL: `http://localhost:6007/iframe.html?globals=&id=vault-details-vaultalpha--base-usdc-vault`

### Success Criteria:

#### Automated Verification:
- [ ] Dev servers start without errors

#### Manual Verification:
- [ ] All test cases pass
- [ ] Transactions execute successfully
- [ ] No console errors related to our changes
- [ ] Icons load correctly
- [ ] Simulation results are mathematically correct

**Implementation Note**: After completing this phase, report any issues found and create follow-up tickets for unresolvable problems.

---

## Testing Strategy

### Unit Tests:
- None required — existing patterns don't have unit tests for chat components

### Integration Tests:
- Full E2E via Playwright browser testing in Phase 7

### Manual Testing Steps:
1. Open chat page for Base USDC vault
2. Ask for vault balances → check icons load
3. Create Aave V3 supply action → check auto-simulation renders
4. Create another action → check cumulative simulation
5. Execute → check wallet flow works
6. Verify agent messages are brief

## Performance Considerations

- Anvil fork simulation adds ~5-10 seconds to each action creation (fork spawn + execution + balance reads)
- TokenIcon fetches are cached by React Query — no duplicate requests
- Protocol icons are static assets served by Next.js — near-instant load

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0037-refine-alpha-agent-chat.md`
- Reference webapp icons: `/Users/kuba/wgenie-labs/wgenie-webapp/public/protocols/`
- Reference market labels: `/Users/kuba/wgenie-labs/wgenie-webapp/src/fusion/markets/components/market-label.tsx`
