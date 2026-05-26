# FSN-0067: Refactor Vault Detail Pages — Implementation Plan

## Overview

Refactor the vault detail page to: (1) tab-switch between deposit and withdraw forms, (2) make the overview tab protocol-specific via tags, (3) move FlowChart from overview to the activity tab, (4) remove the dedicated YO Treasury tab and standalone page, and (5) update sidebar navigation.

## Current State Analysis

- **Vault detail layout** (`vault-detail-layout.tsx`): Two-column — left: header+tabs+content, right: sticky `DepositForm` + `WithdrawForm` stacked simultaneously.
- **Overview tab** (`[address]/page.tsx`): Conditionally renders `TreasuryDashboard` above `VaultOverviewContent` for `yo-treasury` vaults. `VaultOverviewContent` = `VaultMetrics` + `FlowChart`.
- **Activity tab** (`activity/page.tsx`): Shows filter bar + activity table + infinite scroll. No FlowChart.
- **YO tab** (`yo/page.tsx`): Renders `YoTreasuryTab` = `TreasuryDashboard` + `TreasuryChat`. Gated by `yo-treasury` tag.
- **Standalone page** (`app/yo-treasury/page.tsx`): Hardcoded vault, full layout with all sections. Separate `bg-yo-black` styling.
- **Sidebar** (`nav-config.ts`): "YO Treasury" → `/yo-treasury`, "Create YO Treasury" → `/yo-treasury/create`.

### Key Discoveries:
- `VaultOverviewContent` (`vault-overview-content.tsx:6-13`): Simply renders `<VaultMetrics />` + `<FlowChart />`.
- Tab config (`vault-tabs.config.ts:10-38`): 5 tabs, `yo` requires tag `yo-treasury`, `alpha` requires `wgenie-fusion`.
- `TreasuryChat` (`treasury-chat.tsx:21-165`): Needs `chainId`, `vaultAddress`, `callerAddress` props. Uses `useChat` with `/api/yo/treasury/chat`.
- The `yo-treasury/create` route is **kept** — only the standalone YO Treasury page is removed.

## Desired End State

1. **Right column**: Deposit and Withdraw forms behind a tab switcher — only one visible at a time.
2. **Overview tab**:
   - `yo-treasury` vaults: `TreasuryDashboard` + `TreasuryChat` (no `VaultMetrics`, no `FlowChart`)
   - All other vaults: `VaultOverviewContent` = just `VaultMetrics` (no `FlowChart`)
3. **Activity tab**: FlowChart shown above the existing activity content, for ALL vaults regardless of tags.
4. **YO tab**: Removed entirely (tab config entry + route directory).
5. **Standalone `/yo-treasury` page**: `page.tsx` and `layout.tsx` removed. The `/yo-treasury/create` route remains.
6. **Sidebar**: "YO Treasury" link updated from `/yo-treasury` to `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`.

### Verification:
- Visit any vault detail page → right column shows Deposit/Withdraw tabs, only one form visible
- Visit YO Treasury vault overview → shows TreasuryDashboard + TreasuryChat, no metrics/flow chart
- Visit any wGenie Fusion vault overview → shows VaultMetrics only, no FlowChart
- Visit any vault activity tab → FlowChart appears above the activity table
- `/yo` sub-route → 404
- `/yo-treasury` → 404 (or Next.js default not found)
- `/yo-treasury/create` → still works
- Sidebar "YO Treasury" → navigates to `/vaults/8453/0x09d1...`

## What We're NOT Doing

- Not changing the YO Treasury Create page (`/yo-treasury/create`)
- Not modifying the Alpha tab or its tag gating
- Not changing `TreasuryDashboard`, `TreasuryChat`, or any YO component internals
- Not changing `VaultMetrics` internals
- Not modifying the Mastra agent or API routes

## Implementation Approach

Five small, sequential phases. Each phase is independently testable. Phases ordered to minimize breakage — structural changes first, removals last.

---

## Phase 1: Deposit/Withdraw Tab Switcher

### Overview
Replace the stacked deposit+withdraw forms in the right column with a tabbed UI. Only one form visible at a time.

### Changes Required:

#### 1. New component: `VaultActionTabs`

**File**: `packages/web/src/vault-actions/components/vault-action-tabs.tsx` (new)

```tsx
'use client';

import { useState } from 'react';
import { DepositForm } from './deposit-form';
import { WithdrawForm } from './withdraw-form';
import { cn } from '@/lib/utils';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

type Tab = 'deposit' | 'withdraw';

export function VaultActionTabs({ chainId, vaultAddress }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  return (
    <div>
      <div className="flex border-b mb-3">
        {(['deposit', 'withdraw'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 pb-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'deposit' ? (
        <DepositForm chainId={chainId} vaultAddress={vaultAddress} />
      ) : (
        <WithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
      )}
    </div>
  );
}
```

#### 2. Update vault-detail-layout to use VaultActionTabs

**File**: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`

Replace:
```tsx
import { DepositForm } from '@/vault-actions/components/deposit-form';
import { WithdrawForm } from '@/vault-actions/components/withdraw-form';
```
With:
```tsx
import { VaultActionTabs } from '@/vault-actions/components/vault-action-tabs';
```

Replace the right column contents:
```tsx
<div className="lg:sticky lg:top-6 space-y-3">
  <DepositForm chainId={chainId} vaultAddress={vaultAddress} />
  <WithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
</div>
```
With:
```tsx
<div className="lg:sticky lg:top-6">
  <VaultActionTabs chainId={chainId} vaultAddress={vaultAddress} />
</div>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Lint passes: `pnpm --filter @wgenie/web lint`

#### Manual Verification:
- [ ] Visit any vault detail page → right column shows Deposit/Withdraw tab switcher
- [ ] Only one form visible at a time, default is Deposit
- [ ] Clicking Withdraw tab shows withdraw form, hides deposit form
- [ ] Both forms still function correctly (approve, deposit, withdraw)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Move FlowChart to Activity Tab

### Overview
Remove FlowChart from `VaultOverviewContent` and add it to the activity tab page. FlowChart shows for all vaults.

### Changes Required:

#### 1. Remove FlowChart from VaultOverviewContent

**File**: `packages/web/src/vault-details/components/vault-overview-content.tsx`

Change from:
```tsx
import { VaultMetrics } from '@/vault-metrics/vault-metrics';
import { FlowChart } from '@/flow-chart/flow-chart';

export const VaultOverviewContent = () => {
  return (
    <div className="space-y-6">
      <VaultMetrics />
      <FlowChart />
    </div>
  );
};
```

To:
```tsx
import { VaultMetrics } from '@/vault-metrics/vault-metrics';

export const VaultOverviewContent = () => {
  return (
    <div className="space-y-6">
      <VaultMetrics />
    </div>
  );
};
```

#### 2. Add FlowChart to Activity Tab

**File**: `packages/web/src/vault-details/components/vault-activity-content.tsx`

Add import:
```tsx
import { FlowChart } from '@/flow-chart/flow-chart';
```

Add `<FlowChart />` at the top of the return JSX, before the filter bar:
```tsx
return (
  <div className="space-y-4">
    <FlowChart />
    {/* Header with filters and TotalInflows */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      ...
```

Note: `VaultActivityContent` is a `'use client'` component and `FlowChart` is also `'use client'`, so this works directly. `FlowChart` reads `chainId` and `vaultAddress` from `VaultContext`, which is provided by the layout — no props needed.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Lint passes: `pnpm --filter @wgenie/web lint`

#### Manual Verification:
- [ ] Visit any vault overview tab → FlowChart no longer appears
- [ ] Visit any vault activity tab → FlowChart appears above the activity table
- [ ] FlowChart time range picker still works
- [ ] Activity table and infinite scroll still work below the chart

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Protocol-Specific Overview Tab

### Overview
Make the overview page render different content based on vault tags. YO Treasury vaults show `TreasuryDashboard` + `TreasuryChat`. All other vaults show `VaultOverviewContent` (which is now just `VaultMetrics`).

### Changes Required:

#### 1. Update Overview Page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`

Change from:
```tsx
import { VaultOverviewContent } from '@/vault-details/components/vault-overview-content';
import { getVaultFromRegistry, hasTag, VAULT_TAG } from '@/lib/vaults-registry';
import { TreasuryDashboard } from '@/yo-treasury/components/treasury-dashboard';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

export const metadata = {
  title: 'Vault Overview - Fusion by wGenie',
};

export default async function VaultOverviewPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  const vault = getVaultFromRegistry(Number(chainId), address);
  const isYoTreasury = hasTag(vault, VAULT_TAG.YO_TREASURY);

  return (
    <div className="space-y-6">
      {isYoTreasury && (
        <TreasuryDashboard
          chainId={Number(chainId) as ChainId}
          vaultAddress={address as Address}
        />
      )}
      <VaultOverviewContent />
    </div>
  );
}
```

To:
```tsx
import { VaultOverviewContent } from '@/vault-details/components/vault-overview-content';
import { getVaultFromRegistry, hasTag, VAULT_TAG } from '@/lib/vaults-registry';
import { YoTreasuryOverview } from '@/yo-treasury/components/yo-treasury-overview';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

export const metadata = {
  title: 'Vault Overview - Fusion by wGenie',
};

export default async function VaultOverviewPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  const vault = getVaultFromRegistry(Number(chainId), address);
  const isYoTreasury = hasTag(vault, VAULT_TAG.YO_TREASURY);

  if (isYoTreasury) {
    return (
      <YoTreasuryOverview
        chainId={Number(chainId) as ChainId}
        vaultAddress={address as Address}
      />
    );
  }

  return <VaultOverviewContent />;
}
```

#### 2. New component: `YoTreasuryOverview`

**File**: `packages/web/src/yo-treasury/components/yo-treasury-overview.tsx` (new)

This is essentially the same as `YoTreasuryTab` — `TreasuryDashboard` + `TreasuryChat`. We create a new component (rather than reusing `YoTreasuryTab`) because the tab component will be deleted in Phase 4 and naming it "overview" is clearer.

```tsx
'use client';

import { TreasuryChat } from './treasury-chat';
import { TreasuryDashboard } from './treasury-dashboard';
import { useAccount } from 'wagmi';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoTreasuryOverview({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();

  return (
    <div className="space-y-4 font-yo">
      <TreasuryDashboard chainId={chainId} vaultAddress={vaultAddress} />
      <TreasuryChat
        chainId={chainId}
        vaultAddress={vaultAddress}
        callerAddress={address}
      />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Lint passes: `pnpm --filter @wgenie/web lint`

#### Manual Verification:
- [ ] Visit YO Treasury vault overview (`/vaults/8453/0x09d1.../`) → shows TreasuryDashboard + TreasuryChat, no VaultMetrics
- [ ] Visit any wGenie Fusion vault overview → shows VaultMetrics only (no FlowChart, no TreasuryDashboard)
- [ ] TreasuryChat is functional — can send messages, see agent responses
- [ ] TreasuryDashboard shows portfolio summary and allocation table

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 4: Remove YO Tab

### Overview
Delete the `/yo` route and remove the "YO Treasury" tab from the tab configuration. The overview tab now serves this purpose for yo-treasury vaults.

### Changes Required:

#### 1. Remove YO tab from config

**File**: `packages/web/src/vault-details/vault-tabs.config.ts`

Remove the YO tab entry from `TABS`:
```ts
  {
    id: 'yo',
    label: 'YO Treasury',
    description: 'AI-managed yield allocations via YO Protocol',
    requiredTag: 'yo-treasury',
  },
```

#### 2. Delete the YO route directory

Delete: `packages/web/src/app/vaults/[chainId]/[address]/yo/` (entire directory)

#### 3. Delete YoTreasuryTab component

Delete: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`

This component was only used by the `/yo` route page. The new `yo-treasury-overview.tsx` replaces it.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Lint passes: `pnpm --filter @wgenie/web lint`
- [ ] No remaining imports of `yo-treasury-tab`: `grep -r "yo-treasury-tab" packages/web/src/`

#### Manual Verification:
- [ ] YO Treasury vault detail page no longer shows "YO Treasury" tab in nav
- [ ] Navigating to `/vaults/8453/0x09d1.../yo` → 404
- [ ] Overview tab still shows TreasuryDashboard + TreasuryChat for YO Treasury vault

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 5: Remove Standalone YO Page & Update Sidebar

### Overview
Delete the standalone `/yo-treasury` page (keep `/yo-treasury/create`) and update the sidebar link.

### Changes Required:

#### 1. Delete standalone page files

Delete these files only (NOT the `/create` subdirectory):
- `packages/web/src/app/yo-treasury/page.tsx`
- `packages/web/src/app/yo-treasury/layout.tsx`

The `/yo-treasury/create` directory and all its contents remain untouched. Next.js will still serve `/yo-treasury/create` — the parent `layout.tsx` removal means the create page will inherit the root layout instead (which is fine — it's within `AppProviders` via the root).

**Important**: Check if `/yo-treasury/create` has its own layout or relies on the parent. If it relies on the parent's `AppProviders`, we need to add a layout at the create level or move the parent layout to only wrap create.

Looking at the current parent layout (`yo-treasury/layout.tsx`): it wraps in `<AppProviders>` and applies `bg-yo-black font-yo text-white`. The create page likely needs `AppProviders` but may or may not need the YO styling. To be safe, create a minimal layout for the create route:

**File**: `packages/web/src/app/yo-treasury/layout.tsx`

Keep this file but change its content to only wrap children in AppProviders without the standalone page styling:

Actually, simpler approach — just keep the existing `layout.tsx` as-is since it provides `AppProviders` + YO styling for the create page, and only delete `page.tsx`. The `/yo-treasury` URL without the create page will just show a 404 since there's no `page.tsx`.

**Delete**: `packages/web/src/app/yo-treasury/page.tsx` only.

#### 2. Update sidebar navigation

**File**: `packages/web/src/components/sidebar/nav-config.ts`

Change:
```ts
{
  title: 'YO Treasury',
  url: '/yo-treasury',
  icon: Landmark,
},
```

To:
```ts
{
  title: 'YO Treasury',
  url: '/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
  icon: Landmark,
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Lint passes: `pnpm --filter @wgenie/web lint`
- [ ] No remaining imports of deleted page: `grep -r "yo-treasury/page" packages/web/src/app/`

#### Manual Verification:
- [ ] Navigating to `/yo-treasury` → 404 or empty page (no `page.tsx`)
- [ ] Navigating to `/yo-treasury/create` → still works correctly
- [ ] Sidebar "YO Treasury" link → navigates to `/vaults/8453/0x09d1.../`
- [ ] The YO Treasury vault detail page loads correctly from sidebar link
- [ ] Sidebar highlights "YO Treasury" when on that vault's detail page (prefix match on `/vaults`)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Testing Strategy

### Unit Tests:
- No new unit tests needed — this is a structural refactoring of existing working components.

### Integration Tests:
- TypeScript compilation serves as the primary automated check.

### Manual Testing Steps:
1. Visit YO Treasury vault at `/vaults/8453/0x09d1.../` — verify overview shows dashboard + chat
2. Click Activity tab — verify FlowChart + activity table
3. Verify no "YO Treasury" tab in the tab bar
4. Verify right column shows Deposit/Withdraw tab switcher
5. Visit an wGenie Fusion vault — verify overview shows VaultMetrics only
6. Visit an wGenie Fusion vault activity tab — verify FlowChart appears
7. Click sidebar "YO Treasury" — verify navigates to vault detail page
8. Click sidebar "Create YO Treasury" — verify still works
9. Test deposit and withdraw flows through the new tabbed UI

## Performance Considerations

No performance impact. FlowChart was already rendered on the overview page; it now renders on the activity page instead. The tab switcher uses conditional rendering (not hidden) so only one form mounts at a time — slightly better than current state where both mount.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0067-refactor-yo-vaults.md`
- Tab config: `packages/web/src/vault-details/vault-tabs.config.ts`
- Vault detail layout: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`
- Overview page: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`
- Activity content: `packages/web/src/vault-details/components/vault-activity-content.tsx`
- Sidebar nav: `packages/web/src/components/sidebar/nav-config.ts`
