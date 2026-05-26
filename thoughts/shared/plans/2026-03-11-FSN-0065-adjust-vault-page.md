# FSN-0065: Adjust Vault Page — Two-Column Layout & Tag-Based Tabs

## Overview

Restructure the vault detail page into a Morpho-style two-column layout (left: header+tabs+content, right: sticky deposit/withdraw) and add a vault tag system to conditionally show tabs based on vault type (`wgenie-fusion`, `yo-treasury`, `yo-vault`).

## Current State Analysis

- **Layout**: Single-column. Header → tabs → tab content fill the full width.
- **Tabs**: 5 hardcoded tabs (overview, depositors, activity, alpha, yo) shown for ALL vaults regardless of type.
- **Deposit/Withdraw**: Only exist inside YO Treasury tab (`packages/web/src/yo-treasury/components/`). No deposit/withdraw for regular vaults.
- **Tags**: `plasma-vaults.json` has informal tags like "Lending Optimizer". No structural tags for vault type.
- **YO Treasury tab**: Bundles TreasuryDashboard + TreasuryChat + DepositForm + WithdrawForm together.

### Key Discoveries:

- `useVaultReads` hook (`yo-treasury/hooks/use-vault-reads.ts`) is already fully generic (standard ERC4626 + optional PlasmaVault price oracle). Can be used for any vault.
- `DepositForm` and `WithdrawForm` use standard ERC4626 `deposit()`/`redeem()` — no YO-specific logic. Only the import path ties them to `yo-treasury/`.
- `VaultDetailLayout` (`vault-detail-layout.tsx:27`) wraps children in `div.container.mx-auto.px-4.py-6.space-y-6` — this is where the two-column split happens.
- `vault-tabs.config.ts` defines tabs as a static array. No filtering mechanism exists.
- Layout server component (`layout.tsx:28`) already reads `vault` from registry — has access to `tags[]`.

## Desired End State

1. All vaults in `plasma-vaults.json` have a structural tag: `wgenie-fusion` (existing wGenie vaults), `yo-treasury` (the treasury vault), or `yo-vault` (YO Protocol vaults like yoUSD/yoETH/yoBTC/yoEUR)
2. Vault detail page uses a two-column layout:
   - **Left (~65%)**: header, tabs, tab content (scrollable)
   - **Right (~35%, max 380px)**: sticky deposit/withdraw forms, stays in place while scrolling
   - Mobile: right column stacks above tab content
3. Tabs are filtered by vault tags:
   - Alpha tab → only `wgenie-fusion`
   - YO Treasury tab → only `yo-treasury`
   - Overview, Depositors, Activity → all vaults
4. For `yo-treasury` vaults, TreasuryDashboard appears at the top of the Overview tab
5. YO Treasury tab no longer includes deposit/withdraw (they're in the shared right column)

### Verification:
- Visit any `wgenie-fusion` vault: sees Overview, Depositors, Activity, Alpha tabs + deposit/withdraw in right column
- Visit `yo-treasury` vault: sees Overview (with TreasuryDashboard), Depositors, Activity, YO Treasury tabs + deposit/withdraw in right column
- Visit `yo-vault` vault: sees Overview, Depositors, Activity tabs + deposit/withdraw in right column
- Mobile: right column stacks above left column content

## What We're NOT Doing

- No new Ponder indexing for YO Protocol vaults (Depositors/Activity tabs will be empty for them — acceptable)
- No new vault creation flow changes
- Not changing the YO Treasury chat UI behavior
- Not adding any features for `yo-vault` tag (ticket says "So far no extra features")
- Not redesigning the deposit/withdraw form UI (reusing existing components as-is)

## Implementation Approach

Move deposit/withdraw forms + shared hook from `yo-treasury/` to a shared location. Add tag system to `plasma-vaults.json` + registry. Thread tags through layout → header → tabs for conditional rendering. Restructure `vault-detail-layout.tsx` into two-column CSS grid. Show TreasuryDashboard conditionally on overview page.

---

## Phase 1: Tag System in `plasma-vaults.json` + Registry

### Overview
Add structural tags to all vaults and add YO Protocol vaults to the registry.

### Changes Required:

#### 1. Update `plasma-vaults.json`

**File**: `plasma-vaults.json`
**Changes**:
- Add `wgenie-fusion` to every existing vault's `tags` array (except YO Treasury)
- Change YO Treasury's tag from `"YO Treasury"` to `"yo-treasury"`
- Add 4 new YO Protocol vault entries with `yo-vault` tag

New YO vault entries to add:
```json
{
  "name": "yoUSD",
  "address": "0x0000000f2eb9f69274678c76222b35eec7588a65",
  "chainId": 8453,
  "protocol": "YO Protocol",
  "tags": ["yo-vault"],
  "startBlock": 29056193,
  "url": "https://yo.xyz"
},
{
  "name": "yoETH",
  "address": "0x3a43aec53490cb9fa922847385d82fe25d0e9de7",
  "chainId": 8453,
  "protocol": "YO Protocol",
  "tags": ["yo-vault"],
  "startBlock": 29056193,
  "url": "https://yo.xyz"
},
{
  "name": "yoBTC",
  "address": "0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc",
  "chainId": 8453,
  "protocol": "YO Protocol",
  "tags": ["yo-vault"],
  "startBlock": 29056193,
  "url": "https://yo.xyz"
},
{
  "name": "yoEUR",
  "address": "0x50c749ae210d3977adc824ae11f3c7fd10c871e9",
  "chainId": 8453,
  "protocol": "YO Protocol",
  "tags": ["yo-vault"],
  "startBlock": 29056193,
  "url": "https://yo.xyz"
}
```

#### 2. Add tag helper to registry

**File**: `packages/web/src/lib/vaults-registry.ts`
**Changes**: Add a `hasTag` utility function and export tag constants

```typescript
// Tag constants
export const VAULT_TAG = {
  wGenie_FUSION: 'wgenie-fusion',
  YO_TREASURY: 'yo-treasury',
  YO_VAULT: 'yo-vault',
} as const;

export type VaultTag = (typeof VAULT_TAG)[keyof typeof VAULT_TAG];

export function hasTag(vault: ParsedVault | undefined, tag: VaultTag): boolean {
  return vault?.tags.includes(tag) ?? false;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] JSON is valid: `node -e "require('./plasma-vaults.json')"`
- [ ] All 61 vaults parse correctly (57 existing + 4 new)

#### Manual Verification:
- [ ] Vault list page loads and shows all vaults including new YO Protocol vaults

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Move Deposit/Withdraw to Shared Location

### Overview
Move the generic ERC4626 forms and `useVaultReads` hook out of `yo-treasury/` into a shared `vault-actions/` feature directory. Update import paths.

### Changes Required:

#### 1. Create shared directory and move files

**New directory**: `packages/web/src/vault-actions/`

Move files:
- `yo-treasury/hooks/use-vault-reads.ts` → `vault-actions/hooks/use-vault-reads.ts`
- `yo-treasury/components/deposit-form.tsx` → `vault-actions/components/deposit-form.tsx`
- `yo-treasury/components/withdraw-form.tsx` → `vault-actions/components/withdraw-form.tsx`

#### 2. Update import paths in moved files

**File**: `vault-actions/components/deposit-form.tsx`
**Change**: `import { useVaultReads, formatAmountUsd } from '../hooks/use-vault-reads';` (no change needed — relative path stays the same)

**File**: `vault-actions/components/withdraw-form.tsx`
**Change**: Same — relative import stays the same.

#### 3. Update consumers that import from the old location

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
**Change**: Update imports from `./deposit-form` and `./withdraw-form` to `@/vault-actions/components/deposit-form` and `@/vault-actions/components/withdraw-form`

**File**: `packages/web/src/yo-treasury/components/deposit-form.stories.tsx`
**Change**: Update import to `@/vault-actions/components/deposit-form`

**File**: `packages/web/src/yo-treasury/components/withdraw-form.stories.tsx`
**Change**: Update import to `@/vault-actions/components/withdraw-form`

**File**: `packages/web/src/yo-treasury/components/treasury-dashboard.tsx`
**Check**: Uses `useTreasuryPositions` which is yo-treasury-specific — no change needed.

**File**: `packages/web/src/yo-treasury/components/portfolio-summary.tsx`
**Check**: May import `useVaultReads` — update if so.

#### 4. Create barrel export

**New file**: `packages/web/src/vault-actions/index.ts`
```typescript
export { DepositForm } from './components/deposit-form';
export { WithdrawForm } from './components/withdraw-form';
export { useVaultReads, formatAmountUsd } from './hooks/use-vault-reads';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No remaining imports from old paths: `grep -r "from.*yo-treasury.*deposit-form\|from.*yo-treasury.*withdraw-form\|from.*yo-treasury.*use-vault-reads" packages/web/src/ --include="*.ts" --include="*.tsx"` returns nothing (except the stories if they're left in place)

#### Manual Verification:
- [ ] YO Treasury tab still works — deposit and withdraw forms function correctly

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 3: Two-Column Layout

### Overview
Restructure `vault-detail-layout.tsx` into a two-column CSS grid: left column for header+tabs+content, right column for sticky deposit/withdraw forms.

### Changes Required:

#### 1. Pass `tags` through the layout chain

**File**: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
**Changes**: Pass `vault?.tags` to `VaultDetailLayout`

```typescript
return (
  <VaultDetailLayout
    chainId={chainId as ChainId}
    vaultAddress={vaultAddress}
    vaultName={vault?.name}
    protocol={vault?.protocol}
    tags={vault?.tags ?? []}
  >
    {children}
  </VaultDetailLayout>
);
```

#### 2. Restructure `vault-detail-layout.tsx` into two columns

**File**: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`
**Changes**: Add `tags` prop, render two-column grid with deposit/withdraw in sticky right column.

```typescript
'use client';

import { AppProviders } from '@/app/app-providers';
import { VaultProvider } from '@/vault/vault.context';
import { VaultDetailHeader } from '@/vault-details/components/vault-detail-header';
import { DepositForm } from '@/vault-actions/components/deposit-form';
import { WithdrawForm } from '@/vault-actions/components/withdraw-form';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  children: React.ReactNode;
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
  tags: string[];
}

export function VaultDetailLayout({
  children,
  chainId,
  vaultAddress,
  vaultName,
  protocol,
  tags,
}: Props) {
  return (
    <AppProviders>
      <VaultProvider chainId={chainId} vaultAddress={vaultAddress}>
        <div className="container mx-auto px-4 py-6 overflow-x-hidden">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column: header + tabs + content */}
            <div className="flex-1 min-w-0 space-y-6">
              <VaultDetailHeader
                chainId={chainId}
                vaultAddress={vaultAddress}
                vaultName={vaultName}
                protocol={protocol}
                tags={tags}
              />
              {children}
            </div>

            {/* Right column: sticky deposit/withdraw */}
            <div className="w-full lg:w-[380px] shrink-0 order-first lg:order-last">
              <div className="lg:sticky lg:top-6 space-y-3">
                <DepositForm chainId={chainId} vaultAddress={vaultAddress} />
                <WithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
              </div>
            </div>
          </div>
        </div>
      </VaultProvider>
    </AppProviders>
  );
}
```

Key layout decisions:
- `order-first lg:order-last` — on mobile, deposit/withdraw appears above content (like Morpho)
- `lg:w-[380px]` — fixed width right column on desktop
- `lg:sticky lg:top-6` — sticky positioning when scrolling
- `flex-1 min-w-0` — left column takes remaining space, `min-w-0` prevents overflow

#### 3. Pass `tags` to `VaultDetailHeader`

**File**: `packages/web/src/vault-details/components/vault-detail-header.tsx`
**Changes**: Accept `tags: string[]` prop, pass to `VaultDetailTabs`

Add `tags` to interface:
```typescript
interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
  tags: string[];
}
```

Pass to tabs component:
```typescript
<VaultDetailTabs chainId={chainId} vaultAddress={vaultAddress} tags={tags} />
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Visit any vault page — see two-column layout on desktop
- [ ] Deposit/withdraw forms appear in right column, sticky when scrolling
- [ ] On mobile viewport, deposit/withdraw appears above tab content
- [ ] Tab switching works and doesn't affect right column

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 4: Conditional Tabs

### Overview
Filter visible tabs based on vault tags. Alpha tab only for `wgenie-fusion`, YO Treasury tab only for `yo-treasury`.

### Changes Required:

#### 1. Add tag-based filtering to tab config

**File**: `packages/web/src/vault-details/vault-tabs.config.ts`
**Changes**: Add optional `requiredTag` field to `TabConfig` and a filter function.

```typescript
import z from 'zod';

interface TabConfig {
  label: string;
  description: string;
  id: string;
  requiredTag?: string;
}

export const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Key metrics and flow analysis',
  },
  {
    id: 'depositors',
    label: 'Depositors',
    description: 'Depositor information and statistics',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Recent transactions and activity',
  },
  {
    id: 'alpha',
    label: 'Alpha',
    description: 'Chat with AI about this vault',
    requiredTag: 'wgenie-fusion',
  },
  {
    id: 'yo',
    label: 'YO Treasury',
    description: 'AI-managed yield allocations via YO Protocol',
    requiredTag: 'yo-treasury',
  },
] as const satisfies TabConfig[];

export type TabId = (typeof TABS)[number]['id'];

export function getVisibleTabs(tags: string[]) {
  return TABS.filter(
    (tab) => !tab.requiredTag || tags.includes(tab.requiredTag),
  );
}

export const getTabConfig = (id: TabId) => {
  return TABS.find((tab) => tab.id === id);
};

export const tabSchema = z.enum(TABS.map((tab) => tab.id));

export function isValidTab(tab: string): tab is TabId {
  return tabSchema.safeParse(tab).success;
}
```

#### 2. Update `VaultDetailTabs` to filter tabs

**File**: `packages/web/src/vault-details/components/vault-detail-tabs.tsx`
**Changes**: Accept `tags` prop, use `getVisibleTabs()` instead of `TABS`.

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getVisibleTabs } from '@/vault-details/vault-tabs.config';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  tags: string[];
}

export const VaultDetailTabs = ({ chainId, vaultAddress, tags }: Props) => {
  const pathname = usePathname();
  const basePath = `/vaults/${chainId}/${vaultAddress}`;
  const visibleTabs = getVisibleTabs(tags);

  const getTabHref = (tabId: string) => {
    return tabId === 'overview' ? basePath : `${basePath}/${tabId}`;
  };

  const isActive = (tabId: string) => {
    if (tabId === 'overview') {
      return pathname === basePath;
    }
    return pathname === `${basePath}/${tabId}`;
  };

  return (
    <nav className="border-b border-border">
      <div className="flex overflow-x-auto -mb-px">
        {visibleTabs.map(({ id, label }) => (
          <Link
            key={id}
            href={getTabHref(id)}
            className={cn(
              'inline-flex items-center whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive(id)
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Visit an `wgenie-fusion` vault (e.g., wGenie DAI Prime): sees Overview, Depositors, Activity, Alpha tabs. No YO Treasury tab.
- [ ] Visit `yo-treasury` vault (`0x09d1...`): sees Overview, Depositors, Activity, YO Treasury tabs. No Alpha tab.
- [ ] Visit a `yo-vault` vault: sees Overview, Depositors, Activity tabs only. No Alpha or YO Treasury tab.

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 5: YO Treasury Tab Restructure + TreasuryDashboard on Overview

### Overview
Remove deposit/withdraw from YO Treasury tab (now in the shared right column). Show TreasuryDashboard at the top of the Overview tab for `yo-treasury` vaults.

### Changes Required:

#### 1. Simplify `YoTreasuryTab` — remove forms

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
**Changes**: Remove DepositForm and WithdrawForm imports and rendering. The tab now just shows TreasuryDashboard + TreasuryChat.

```typescript
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

export function YoTreasuryTab({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();

  return (
    <div className="space-y-4 font-yo">
      {/* Dashboard — always visible, primary view */}
      <TreasuryDashboard chainId={chainId} vaultAddress={vaultAddress} />

      {/* AI Copilot */}
      <TreasuryChat
        chainId={chainId}
        vaultAddress={vaultAddress}
        callerAddress={address}
      />
    </div>
  );
}
```

#### 2. Show TreasuryDashboard on Overview tab for `yo-treasury` vaults

**File**: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`
**Changes**: Read vault tags from registry, conditionally render TreasuryDashboard above VaultOverviewContent.

```typescript
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

Note: `TreasuryDashboard` is a `'use client'` component, which is fine to import from a Server Component page — Next.js handles this correctly.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Visit YO Treasury vault Overview tab: TreasuryDashboard (portfolio summary + allocation table) appears above VaultMetrics + FlowChart
- [ ] Visit YO Treasury's YO Treasury tab: shows TreasuryDashboard + TreasuryChat (no deposit/withdraw forms — they're in the right column)
- [ ] Visit any `wgenie-fusion` vault Overview tab: no TreasuryDashboard shown
- [ ] Deposit/withdraw in right column works correctly for YO Treasury vault

**Implementation Note**: Pause for final manual confirmation.

---

## Testing Strategy

### Manual Testing Steps:

1. **wgenie-fusion vault** (e.g., `/vaults/1/0x20e934...`):
   - Two-column layout visible
   - Tabs: Overview, Depositors, Activity, Alpha
   - Deposit/withdraw forms in right column
   - Alpha chat works

2. **yo-treasury vault** (`/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`):
   - Two-column layout visible
   - Tabs: Overview, Depositors, Activity, YO Treasury
   - Overview tab shows TreasuryDashboard + VaultMetrics + FlowChart
   - YO Treasury tab shows TreasuryDashboard + TreasuryChat
   - Deposit/withdraw in right column (not inside YO Treasury tab)

3. **yo-vault** (e.g., `/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`):
   - Two-column layout visible
   - Tabs: Overview, Depositors, Activity
   - Deposit/withdraw forms in right column

4. **Mobile viewport** (all vault types):
   - Single-column layout
   - Deposit/withdraw forms appear above tab content

## Performance Considerations

- `useVaultReads` fires ~7 sequential RPC calls per form. With two forms sharing the same hook, there are 14 calls. However, both instances read the same vault so wagmi's request deduplication (same contract + args + chainId) will merge them automatically. Net effect: same number of RPC calls as before.
- No new data fetching — TreasuryDashboard on Overview is the same component that was already in the YO Treasury tab.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0065-adjust-vault-page.md`
- Morpho reference layout: https://app.morpho.org/base/vault/0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2/steakhouse-prime-usdc
- Euler reference layout: https://app.euler.finance/vault/0x69ebF644533655B5D3b6455e8E47ddE21b5993f1?network=ethereum
- Key files:
  - `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx` — main layout change
  - `packages/web/src/vault-details/vault-tabs.config.ts` — tab filtering
  - `packages/web/src/lib/vaults-registry.ts` — tag helpers
  - `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx` — simplified
  - `packages/web/src/vault-actions/` — new shared location for forms
