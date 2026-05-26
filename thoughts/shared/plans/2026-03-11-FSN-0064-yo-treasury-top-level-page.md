# YO Treasury Top-Level Page — Implementation Plan

## Overview

Transform `/yo-treasury` from a barebones chat-only page into an immersive, full-screen YO-branded treasury management page. Hardcoded to the Base demo vault (`0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`). Merges the best of the Overview tab (VaultMetrics, FlowChart) and the YO Treasury tab (TreasuryDashboard, Chat, Forms) into a single world-class experience with no sidebar — the page is its own universe.

**Hackathon alignment:**
- UX Simplicity (30%) — single immersive page, zero navigation required, dashboard-first
- Creativity (30%) — meta-vault (Fusion on top of YO) with AI copilot, stunning dark-theme aesthetic
- Integration Quality (20%) — VaultProvider, @yo-protocol/core hooks, real on-chain data
- Risk & Trust (20%) — live positions, real transactions, transparent dashboard

## Current State Analysis

**`/yo-treasury` page** (`packages/web/src/app/yo-treasury/page.tsx`):
- Only renders `TreasuryChat` — no dashboard, no forms, no vault context
- Uses `SidebarLayout` via `yo-treasury/layout.tsx`

**`/vaults/[chainId]/[address]/yo` tab** has the full experience:
- `TreasuryDashboard` (PortfolioSummary + AllocationTable)
- `TreasuryChat` + `DepositForm` + `WithdrawForm`
- Wrapped in `VaultProvider` (from vault detail layout)

**Components we'll reuse directly:**
- `TreasuryDashboard` (`yo-treasury/components/treasury-dashboard.tsx`) — PortfolioSummary + AllocationTable
- `TreasuryChat` (`yo-treasury/components/treasury-chat.tsx`)
- `DepositForm` (`yo-treasury/components/deposit-form.tsx`)
- `WithdrawForm` (`yo-treasury/components/withdraw-form.tsx`)
- `VaultMetrics` (`vault-metrics/vault-metrics.tsx`) — needs `VaultContext`
- `FlowChart` (`flow-chart/flow-chart.tsx`) — needs `VaultContext`

**Key dependency:** Both `VaultMetrics` and `FlowChart` call `useVaultContext()` for `chainId` and `vaultAddress`. The new page must wrap content in `VaultProvider`.

### Key Discoveries:

- `VaultProvider` (`vault/vault.context.tsx:20-36`) only needs `chainId` + `vaultAddress` props
- `VaultMetrics` fetches from `/api/vaults/${chainId}/${vaultAddress}/metrics` (Supabase-backed)
- `FlowChart` fetches bucket data via `useFlowChartQuery` (also Supabase-backed)
- YO theme tokens already defined in `global.css:82-91`: `--color-yo-neon`, `--color-yo-dark`, `--color-yo-muted`, `--font-yo`
- Existing YO components already use `font-yo`, `bg-yo-dark`, `text-yo-neon`, `text-yo-muted` classes
- Demo vault address: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base (8453)
- Sidebar nav link exists at `nav-config.ts:31-34` pointing to `/yo-treasury`

## Desired End State

A single page at `/yo-treasury` that:

1. **No sidebar** — immersive full-screen YO-branded experience
2. **Custom header** — YO branding, vault name, chain badge, vault address, home link
3. **Hero stats section** — PortfolioSummary (4 cards: Total Value, Allocated, Unallocated, Active Vaults) + VaultMetrics (4 cards: TVL, Vault Age, Active Depositors, All-time Depositors) in two rows
4. **Data section** — AllocationTable + FlowChart side-by-side (or stacked on mobile)
5. **Action section** — TreasuryChat + DepositForm + WithdrawForm
6. **Full YO aesthetic** — black `#000` background, neon green `#D6FF34` accents, Space Grotesk typography, atmospheric glow effects

### Verification:
- Navigate to `http://localhost:3000/yo-treasury` — page loads with full dashboard, no sidebar
- Click home link in header → navigates to `/`
- PortfolioSummary shows treasury positions (or loading states)
- VaultMetrics shows vault TVL, age, depositors
- FlowChart renders with time range selector
- AllocationTable shows YO vault allocations
- Chat works — can send messages and get AI responses
- Deposit/Withdraw forms are functional
- Sidebar "YO Treasury" link from other pages navigates correctly

## What We're NOT Doing

- NOT modifying the vault detail page (`/vaults/[chainId]/[address]`) — tabs, Alpha tab, default tab all stay as-is
- NOT creating new components from scratch — reusing existing treasury components
- NOT changing the sidebar nav config (link already exists)
- NOT modifying component APIs — wrapping them in the new layout
- NOT touching `/yo-treasury/create` — it keeps its own layout

## Implementation Approach

The key insight is that all the components already exist and work. We're composing them into a new immersive layout. The main work is:
1. Change the layout to remove the sidebar and add YO branding
2. Create a new page component that wires everything together
3. Apply YO dark-theme styling to the container

---

## Phase 1: Layout & Page Shell

### Overview
Remove sidebar from `/yo-treasury`, create immersive full-screen layout with VaultProvider wiring and YO-branded custom header.

### Changes Required:

#### 1. Update YO Treasury Layout

**File**: `packages/web/src/app/yo-treasury/layout.tsx`
**Changes**: Remove `SidebarLayout`, keep `AppProviders`, add full-screen YO-branded wrapper

```tsx
'use client';

import { AppProviders } from '@/app/app-providers';

export default function YoTreasuryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-yo-black font-yo text-white">
        {children}
      </div>
    </AppProviders>
  );
}
```

**Note**: The `/yo-treasury/create` sub-route also uses this layout. We need to check if the create page needs the sidebar. If so, we'll need to handle this — either by moving the create page to a different route group or conditionally rendering the sidebar.

**Resolution**: Check `packages/web/src/app/yo-treasury/create/page.tsx` — if it's a standalone wizard (it is, based on research), the full-screen YO layout actually works well for it too. Both pages are YO-branded experiences.

#### 2. Create YO Treasury Header Component

**File**: `packages/web/src/yo-treasury/components/treasury-header.tsx` (NEW)
**Changes**: Custom header with YO branding, home link, vault info

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { ChainIcon } from '@/components/chain-icon';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  vaultName: string;
}

export function TreasuryHeader({ chainId, vaultAddress, vaultName }: Props) {
  return (
    <header className="border-b border-white/5 bg-yo-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Home link + vault identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-yo-muted hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ChainIcon chainId={chainId} className="w-5 h-5" />
            <h1 className="text-sm font-semibold tracking-tight text-white">
              {vaultName}
            </h1>
          </div>
        </div>

        {/* Right: Vault address */}
        <BlockExplorerAddress
          chainId={chainId}
          address={vaultAddress}
          visibleDigits={4}
        />
      </div>
    </header>
  );
}
```

#### 3. Rewrite YO Treasury Page

**File**: `packages/web/src/app/yo-treasury/page.tsx`
**Changes**: Full rewrite — compose all sections with VaultProvider

```tsx
'use client';

import { VaultProvider } from '@/vault/vault.context';
import { TreasuryHeader } from '@/yo-treasury/components/treasury-header';
import { TreasuryDashboard } from '@/yo-treasury/components/treasury-dashboard';
import { TreasuryChat } from '@/yo-treasury/components/treasury-chat';
import { DepositForm } from '@/yo-treasury/components/deposit-form';
import { WithdrawForm } from '@/yo-treasury/components/withdraw-form';
import { VaultMetrics } from '@/vault-metrics/vault-metrics';
import { FlowChart } from '@/flow-chart/flow-chart';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';
import type { Address } from 'viem';

const VAULT_ADDRESS = '0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D' as Address;
const CHAIN_ID = base.id;
const VAULT_NAME = 'YO Treasury';

export default function YoTreasuryPage() {
  const { address } = useAccount();

  return (
    <VaultProvider chainId={CHAIN_ID} vaultAddress={VAULT_ADDRESS}>
      {/* Header */}
      <TreasuryHeader
        chainId={CHAIN_ID}
        vaultAddress={VAULT_ADDRESS}
        vaultName={VAULT_NAME}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section 1: Hero Stats — Portfolio Summary + Vault Metrics */}
        <section className="space-y-4">
          <TreasuryDashboard chainId={CHAIN_ID} vaultAddress={VAULT_ADDRESS} />
          <VaultMetrics />
        </section>

        {/* Section 2: Flow Chart */}
        <section>
          <FlowChart />
        </section>

        {/* Section 3: Chat + Forms */}
        <section className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            <TreasuryChat
              chainId={CHAIN_ID}
              vaultAddress={VAULT_ADDRESS}
              callerAddress={address}
            />
          </div>
          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20 lg:self-start space-y-3 order-1 lg:order-2">
            <DepositForm chainId={CHAIN_ID} vaultAddress={VAULT_ADDRESS} />
            <WithdrawForm chainId={CHAIN_ID} vaultAddress={VAULT_ADDRESS} />
          </div>
        </section>
      </main>
    </VaultProvider>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] App builds: `cd packages/web && pnpm build`
- [ ] No lint errors in changed files

#### Manual Verification:
- [ ] Navigate to `http://localhost:3000/yo-treasury` — page loads without sidebar
- [ ] Header shows: back arrow, chain icon, "YO Treasury", vault address link
- [ ] Back arrow navigates to `/`
- [ ] PortfolioSummary cards render (loading states or data)
- [ ] VaultMetrics cards render below
- [ ] FlowChart renders with time range selector
- [ ] AllocationTable shows YO vault rows
- [ ] Chat input works — can type and send messages
- [ ] Deposit/Withdraw forms render on the right side
- [ ] Page background is black (#000)
- [ ] `/yo-treasury/create` still works (not broken by layout change)
- [ ] Sidebar "YO Treasury" link from other pages navigates correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: YO Brand Polish & Immersive Aesthetic

### Overview
Apply full YO dark-theme immersion to the page. The existing components already use YO tokens (`bg-yo-dark`, `text-yo-neon`, etc.), but the container and overview components (VaultMetrics, FlowChart) use the default theme. This phase makes the entire page feel unmistakably YO.

### Changes Required:

#### 1. Style VaultMetrics for YO theme

The `VaultMetrics` component uses `VaultMetricsItem` which renders generic shadcn cards. We need to either:
- (A) Override styles at the container level via CSS classes
- (B) Create a thin YO-styled wrapper that re-renders the same data

**Approach**: Option (A) — wrap `VaultMetrics` in a styled container. The existing component renders a grid of cards. We add a `yo-metrics` wrapper class and use CSS to override card styles to match YO dark theme.

**File**: `packages/web/src/app/yo-treasury/page.tsx`
**Changes**: Add YO-themed wrapper around `VaultMetrics`

```tsx
{/* Vault Metrics — YO themed */}
<div className="[&_.grid]:gap-3 [&_[class*='rounded-lg']]:bg-yo-dark [&_[class*='rounded-lg']]:border-white/5">
  <VaultMetrics />
</div>
```

If Tailwind descendant selectors don't work cleanly, create a thin wrapper component instead.

#### 2. Style FlowChart for YO theme

Same approach — the FlowChart renders with default card styling. Apply YO overrides.

**File**: `packages/web/src/app/yo-treasury/page.tsx`
**Changes**: Wrap FlowChart in YO-styled container

#### 3. Add atmospheric effects to the page

**File**: `packages/web/src/app/yo-treasury/page.tsx`
**Changes**: Add subtle neon glow effects, noise texture, and ambient lighting

- Subtle radial gradient glow behind the hero stats section
- Fine noise overlay at very low opacity
- Neon accent glow on the header

#### 4. Section headers with YO styling

Add section dividers/headers between Dashboard, Charts, and Chat sections:
- "PORTFOLIO" / "ANALYTICS" / "AI COPILOT" — small uppercase tracking-wider labels in `text-yo-muted`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors

#### Manual Verification:
- [ ] Entire page has black (#000) background — no white/gray areas leaking through
- [ ] VaultMetrics cards match YO dark theme (bg-yo-dark, white/5 borders)
- [ ] FlowChart matches YO dark theme
- [ ] Atmospheric glow effects are visible but subtle
- [ ] Section labels are visible and styled in YO muted uppercase
- [ ] Page feels cohesive — no "theme switching" between sections
- [ ] Mobile responsive: cards stack properly, forms move above chat

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:
- No new unit tests needed — we're composing existing tested components

### Integration Tests:
- No new integration tests — existing component tests cover the building blocks

### Manual Testing Steps:
1. Start dev server: `cd packages/web && pnpm dev`
2. Navigate to `http://localhost:3000/yo-treasury`
3. Verify full page loads with all sections
4. Test chat: type "show me yo vaults" and verify AI responds
5. Test deposit form: enter amount, verify it interacts with wallet
6. Test withdraw form: same verification
7. Test responsive: resize browser to mobile widths
8. Navigate to `http://localhost:3000/yo-treasury/create` — verify it still works
9. Navigate to `/` or `/vaults` — verify sidebar shows "YO Treasury" link
10. Click "YO Treasury" in sidebar — verify navigation to the immersive page
11. Verify back arrow in header navigates to `/`

## Performance Considerations

- VaultProvider makes 2 batched RPC calls (cached `staleTime: Infinity`)
- VaultMetrics fetches `/api/.../metrics` (cached 5 minutes)
- FlowChart fetches bucket data (standard query caching)
- TreasuryDashboard has 3 hooks with their own caching
- All queries are independent — they fire in parallel, no waterfall
- No performance concerns with composing these on one page

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0064-yo-treasury-top-level-page.md`
- Hackathon details: `thoughts/kuba/notes/yo-hackathon/details.md`
- Project plan: `thoughts/kuba/notes/yo-hackathon/project-plan/`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- YO Design skill: `.claude/skills/yo-design/SKILL.md`
- YO Brand Kit: `.claude/skills/yo-design/references/brand-kit.md`
- Demo vault: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base (8453)
