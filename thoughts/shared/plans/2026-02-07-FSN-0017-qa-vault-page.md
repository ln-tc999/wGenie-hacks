# Fix Issues And Refactor Vault Page — Implementation Plan

## Overview

Comprehensive refactor of the vault detail pages (`/vaults/[chainId]/[address]/...`). Restructure routing from a catch-all `[...tab]` to separate Next.js route segments per tab. Pull static vault data (name, protocol) from the registry at the server level. Replace `window.location.href` navigation with Next.js `<Link>`. Use proper shadcn Breadcrumb components. Present external links (Etherscan, DeBank) compactly inline in the header. Remove the global time range selector. Improve mobile responsiveness with world-class support (no horizontal scroll, adjusted sizes, above-the-fold focus).

## Current State Analysis

### Architecture Issues Found

1. **Client-side navigation everywhere**: Breadcrumbs use `window.location.href = '/'` and `window.location.href = '/vaults'` (`vault-header.tsx:18,26`) — causes full page reloads instead of SPA navigation
2. **`<a>` tags for tab links**: Tab navigation uses raw `<a>` tags (`vault-tabs.tsx:30`) instead of Next.js `<Link>` — no prefetching, no SPA behavior
3. **`window.history.replaceState`** for tab URL updates (`use-vault-details.ts:49`) — bypasses Next.js router entirely
4. **Hardcoded placeholder data**: `protocol = 'Unknown Protocol'` and `tvl = 0` (`use-vault-details.ts:12-13`) — never populated with real values
5. **Global time range with localStorage**: `GlobalTimeSelector` component persists time range to localStorage (`vault-details.utils.ts:57-77`) — ticket says features should handle time range internally
6. **Duplicate utility functions**: `vault-details.utils.ts:80-95` duplicates `lib/get-explorer-address-url.ts` and `lib/get-debank-profile-url.ts`
7. **ExternalLinks buried at bottom**: Rendered last in `vault-overview.tsx:13` — ticket says move to top
8. **Verbose ExternalLinks component**: Full Card with CardHeader/CardContent wrapping just 2 link buttons (`external-links.tsx:41-87`)
9. **`window.open()` for external links**: (`external-links.tsx:37`) — should be native `<a>` tags with `target="_blank"`
10. **No TokenIcon/ChainIcon in header**: Vault header shows raw text protocol/asset/address — no visual identity
11. **Layout is `'use client'`**: `vaults/layout.tsx:1` is client component using `usePathname()` — could be simplified
12. **No vault registry lookup**: Vault detail page doesn't look up vault in `plasma-vaults.json` — fetches name/symbol via client-side wagmi RPC calls instead
13. **Unnecessary VaultDetailsProvider**: Context wraps time range, tab state, hardcoded protocol/tvl — all can be eliminated with server-side routing and registry lookup
14. **debank-icon.svg unused**: Ticket asks to use `packages/web/public/assets/debank-icon.svg` but current implementation uses lucide `TrendingUp` icon instead

### Key Discoveries:
- `getExplorerAddressUrl()` already exists at `lib/get-explorer-address-url.ts:11` — uses viem chain data
- `getDebankProfileUrl()` already exists at `lib/get-debank-profile-url.ts:8`
- `BlockExplorerAddress` component at `components/ui/block-explorer-address.tsx` — reusable address display with copy button
- shadcn Breadcrumb components available at `components/ui/breadcrumb.tsx` — includes `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`
- `ERC4626_VAULTS` at `lib/vaults-registry.ts:40` has `name`, `protocol`, `address`, `chainId` — sufficient for server-side header data
- `TokenIcon` at `components/token-icon/token-icon.tsx:34` — client component (uses wagmi hooks)
- `ChainIcon` at `components/chain-icon/chain-icon.tsx:14` — can be used in server or client
- Activity page pattern (`activity/page.tsx → activity-server.tsx → activity-content.tsx`) shows the three-layer architecture to follow
- Flow chart component has its own internal time range picker (`flow-chart/flow-chart.params.tsx:7`) — independent from global selector

## Desired End State

After implementation:
1. **Separate routes**: `/vaults/[chainId]/[address]/page.tsx` (overview), `/depositors/page.tsx`, `/activity/page.tsx`, `/performance/page.tsx`
2. **Server-rendered header**: Vault name, protocol, address, chain from registry — no loading flicker
3. **Next.js `<Link>`** for all navigation (breadcrumbs, tabs)
4. **Compact external links** inline in the header next to address: Etherscan icon + DeBank icon (using `debank-icon.svg`)
5. **No global time range** — each feature manages its own time range internally
6. **TokenIcon + ChainIcon** visible in the vault header
7. **Mobile-first responsive** layout with no horizontal scroll, great space management, above-the-fold focus
8. **Clean codebase**: No duplicate utils, no dead VaultDetailsProvider, no localStorage time range persistence

### Verification:
- Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e` — overview page renders with vault name, protocol, icons
- Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e/depositors` — depositors tab renders
- Breadcrumb links use SPA navigation (no full page reload)
- Tab links use SPA navigation (no full page reload)
- External links open in new tab with proper icons
- Mobile viewport shows no horizontal scroll, content fits within viewport
- No TypeScript errors

## What We're NOT Doing

- NOT refactoring internal feature modules (flow-chart, depositors-chart, depositors-list, vault-metrics) — they keep their existing context/hook patterns
- NOT adding new data fetching (price oracle, USD values) to the vault detail page — that's a separate ticket
- NOT implementing the Activity tab content — that's FSN-0018
- NOT implementing the Performance tab content — future ticket
- NOT changing the vault list page (`/vaults`) — that was FSN-0016
- NOT changing the API route handlers (`/api/vaults/[chainId]/[address]/*`) — they continue to work as-is

## Implementation Approach

**Strategy**: Work from the outside in — first set up the new routing structure and shared layout with server-side data, then redesign the header, then wire up tab content, then clean up dead code, then test responsiveness.

The key architectural change is moving from a single `[...tab]` catch-all with a client-side `VaultDetailsProvider` managing tab state, to separate per-tab route segments where Next.js handles tab routing natively. Each tab's `page.tsx` is a server component that validates params and renders the appropriate client islands.

---

## Phase 1: Registry Lookup + Route Restructuring

### Overview
Add a vault registry lookup function, create a shared layout for the vault detail page that reads vault metadata from the registry, and create separate route segment files for each tab.

### Changes Required:

#### 1. Add vault registry lookup function

**File**: `packages/web/src/lib/vaults-registry.ts`
**Changes**: Add `getVaultFromRegistry()` function

```typescript
// Build lookup map once at module level for O(1) lookups
const VAULT_LOOKUP = new Map<string, ParsedVault>();
for (const vault of ERC4626_VAULTS) {
  VAULT_LOOKUP.set(
    `${vault.chainId}:${vault.address.toLowerCase()}`,
    vault
  );
}

export function getVaultFromRegistry(
  chainId: number,
  address: string
): ParsedVault | undefined {
  return VAULT_LOOKUP.get(`${chainId}:${address.toLowerCase()}`);
}
```

#### 2. Create shared vault detail layout

**File**: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx` (new)
**Changes**: Server component layout that validates params, looks up vault in registry, renders header + tab navigation, wraps children in providers

```tsx
import { notFound } from 'next/navigation';
import { isAddress, type Address } from 'viem';
import { isValidChainId, type ChainId } from '@/app/chains.config';
import { getVaultFromRegistry } from '@/lib/vaults-registry';
import { VaultDetailLayout } from './vault-detail-layout';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    chainId: string;
    address: string;
  }>;
}

export default async function VaultLayout({ children, params }: LayoutProps) {
  const { chainId: chainIdParam, address: addressParam } = await params;

  // Validate chainId
  const chainId = parseInt(chainIdParam, 10);
  if (isNaN(chainId) || !isValidChainId(chainId)) {
    notFound();
  }

  // Validate address
  if (!isAddress(addressParam)) {
    notFound();
  }

  const vaultAddress = addressParam as Address;

  // Look up vault in registry for static metadata
  const vault = getVaultFromRegistry(chainId, vaultAddress);

  return (
    <VaultDetailLayout
      chainId={chainId}
      vaultAddress={vaultAddress}
      vaultName={vault?.name}
      protocol={vault?.protocol}
    >
      {children}
    </VaultDetailLayout>
  );
}
```

#### 3. Create client layout component (server bridge)

**File**: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx` (new)
**Changes**: Client component that wraps children in AppProviders + VaultProvider, renders header and tabs

```tsx
'use client';

import { AppProviders } from '@/app/app-providers';
import { VaultProvider } from '@/vault/vault.context';
import { VaultDetailHeader } from '@/vault-details/components/vault-detail-header';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  children: React.ReactNode;
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
}

export function VaultDetailLayout({
  children,
  chainId,
  vaultAddress,
  vaultName,
  protocol,
}: Props) {
  return (
    <AppProviders>
      <VaultProvider chainId={chainId} vaultAddress={vaultAddress}>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <VaultDetailHeader
            chainId={chainId}
            vaultAddress={vaultAddress}
            vaultName={vaultName}
            protocol={protocol}
          />
          {children}
        </div>
      </VaultProvider>
    </AppProviders>
  );
}
```

#### 4. Create overview tab route

**File**: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx` (new)
**Changes**: Server component that renders overview tab content. This is the default route for `/vaults/[chainId]/[address]`.

```tsx
export const metadata = {
  title: 'Vault Overview - Fusion by wGenie',
};

export default function VaultOverviewPage() {
  return <VaultOverviewContent />;
}
```

Where `VaultOverviewContent` is a client component imported from the vault-details feature module (created in Phase 3).

#### 5. Create depositors tab route

**File**: `packages/web/src/app/vaults/[chainId]/[address]/depositors/page.tsx` (new)

```tsx
export const metadata = {
  title: 'Vault Depositors - Fusion by wGenie',
};

export default function VaultDepositorsPage() {
  return <VaultDepositorsContent />;
}
```

#### 6. Create activity tab route

**File**: `packages/web/src/app/vaults/[chainId]/[address]/activity/page.tsx` (new)

```tsx
export const metadata = {
  title: 'Vault Activity - Fusion by wGenie',
};

export default function VaultActivityPage() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">Activity</h3>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

#### 7. Create performance tab route

**File**: `packages/web/src/app/vaults/[chainId]/[address]/performance/page.tsx` (new)

```tsx
export const metadata = {
  title: 'Vault Performance - Fusion by wGenie',
};

export default function VaultPerformancePage() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">Performance</h3>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`
- [ ] New route files exist under `packages/web/src/app/vaults/[chainId]/[address]/`
- [ ] `getVaultFromRegistry()` function is exported from `vaults-registry.ts`

#### Manual Verification:
- [ ] Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e` — page loads (even if header is WIP)
- [ ] Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e/depositors` — page loads
- [ ] Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e/activity` — shows "Coming soon"
- [ ] Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e/performance` — shows "Coming soon"
- [ ] Invalid chainId (e.g., `/vaults/999/0x...`) returns 404
- [ ] Invalid address returns 404

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Vault Header Redesign

### Overview
Replace the current `VaultHeader` with a new `VaultDetailHeader` component that uses shadcn Breadcrumb with Next.js Link, shows TokenIcon + ChainIcon, displays compact inline external links next to the vault address, and shows real protocol/name from registry. Includes tab navigation using Next.js Link.

### Changes Required:

#### 1. Create new VaultDetailHeader component

**File**: `packages/web/src/vault-details/components/vault-detail-header.tsx` (new)
**Changes**: New header component replacing old `vault-header.tsx`

```tsx
import Link from 'next/link';
import Image from 'next/image';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import { VaultDetailTabs } from './vault-detail-tabs';
import { useVaultContext } from '@/vault/vault.context';
import { getDebankProfileUrl } from '@/lib/get-debank-profile-url';
import { getChainName } from '@/lib/vaults-registry';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
}

export const VaultDetailHeader = ({
  chainId,
  vaultAddress,
  vaultName,
  protocol,
}: Props) => {
  const { name: onChainName, asset } = useVaultContext();

  // Prefer registry name, fall back to on-chain name
  const displayName = vaultName || onChainName || 'Vault';
  const displayProtocol = protocol || 'Unknown';
  const debankUrl = getDebankProfileUrl(vaultAddress);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/vaults">Vaults</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Vault Identity */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {/* Title row with icons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ChainIcon chainId={chainId} className="w-7 h-7" />
              <TokenIcon chainId={chainId} address={asset} className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Protocol: <span className="text-foreground font-medium">{displayProtocol}</span>
            </span>
            <span>
              Chain: <span className="text-foreground font-medium">{getChainName(chainId)}</span>
            </span>
          </div>
        </div>

        {/* External links — compact inline */}
        <div className="flex items-center gap-3">
          <BlockExplorerAddress
            chainId={chainId}
            address={vaultAddress}
            visibleDigits={6}
          />
          <a
            href={debankUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="View on DeBank"
          >
            <Image
              src="/assets/debank-icon.svg"
              alt="DeBank"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="hidden sm:inline">DeBank</span>
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <VaultDetailTabs chainId={chainId} vaultAddress={vaultAddress} />
    </div>
  );
};
```

#### 2. Create new VaultDetailTabs component

**File**: `packages/web/src/vault-details/components/vault-detail-tabs.tsx` (new)
**Changes**: Tab navigation using Next.js Link and `usePathname()` for active state

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TABS } from '@/vault-details/vault-tabs.config';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export const VaultDetailTabs = ({ chainId, vaultAddress }: Props) => {
  const pathname = usePathname();
  const basePath = `/vaults/${chainId}/${vaultAddress}`;

  const getTabHref = (tabId: string) => {
    return tabId === 'overview' ? basePath : `${basePath}/${tabId}`;
  };

  const isActive = (tabId: string) => {
    if (tabId === 'overview') {
      // Active when path is exactly the base path (no sub-segment)
      return pathname === basePath;
    }
    return pathname === `${basePath}/${tabId}`;
  };

  return (
    <nav className="border-b border-border">
      <div className="flex overflow-x-auto scrollbar-hide -mb-px">
        {TABS.map(({ id, label }) => (
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

This uses an underline-style tab pattern (border-bottom) instead of the current pill-style tabs. The underline pattern is more standard for page-level navigation and works better with Next.js route-based tabs since tabs represent actual pages.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Header shows vault name from registry (not "undefined" or loading flicker)
- [ ] Header shows protocol name from registry
- [ ] ChainIcon and TokenIcon are visible
- [ ] Breadcrumbs use SPA navigation (click "Vaults" — no full page reload, check network tab)
- [ ] Tab links use SPA navigation (click "Depositors" — no full page reload)
- [ ] Active tab has visible underline indicator
- [ ] Block explorer address shows with copy button
- [ ] DeBank link shows with debank-icon.svg, opens in new tab
- [ ] On mobile: header stacks vertically, external links wrap below vault identity
- [ ] On mobile: tabs scroll horizontally if needed (no wrapping to multiple lines)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Tab Content Composition

### Overview
Wire up each tab's page.tsx to render the appropriate feature components. Remove the `GlobalTimeSelector`. Create thin client wrapper components for each tab that provide the necessary context/providers.

### Changes Required:

#### 1. Create overview content component

**File**: `packages/web/src/vault-details/components/vault-overview-content.tsx` (new)
**Changes**: Client component that renders VaultMetrics + FlowChart (ExternalLinks removed — now in header)

```tsx
'use client';

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

#### 2. Create depositors content component

**File**: `packages/web/src/vault-details/components/vault-depositors-content.tsx` (new)
**Changes**: Client component that renders DepositorsChart + DepositorsList

```tsx
'use client';

import { DepositorsChart } from '@/depositors-chart/depositors-chart';
import { DepositorsList } from '@/depositors-list/depositors-list';

export const VaultDepositorsContent = () => {
  return (
    <div className="space-y-6">
      <DepositorsChart />
      <DepositorsList />
    </div>
  );
};
```

#### 3. Update overview page.tsx

**File**: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`
**Changes**: Import and render `VaultOverviewContent`

```tsx
import { VaultOverviewContent } from '@/vault-details/components/vault-overview-content';

export const metadata = {
  title: 'Vault Overview - Fusion by wGenie',
};

export default function VaultOverviewPage() {
  return <VaultOverviewContent />;
}
```

#### 4. Update depositors page.tsx

**File**: `packages/web/src/app/vaults/[chainId]/[address]/depositors/page.tsx`
**Changes**: Import and render `VaultDepositorsContent`

```tsx
import { VaultDepositorsContent } from '@/vault-details/components/vault-depositors-content';

export const metadata = {
  title: 'Vault Depositors - Fusion by wGenie',
};

export default function VaultDepositorsPage() {
  return <VaultDepositorsContent />;
}
```

#### 5. Activity and Performance pages stay as placeholders

Already created in Phase 1 with "Coming soon" UI. No changes needed.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Overview tab shows VaultMetrics cards (TVL, Age, Active Depositors, All-time Depositors)
- [ ] Overview tab shows FlowChart with its own time range picker
- [ ] Overview tab does NOT show GlobalTimeSelector or ExternalLinks card
- [ ] Depositors tab shows DepositorsChart (pie chart)
- [ ] Depositors tab shows DepositorsList (table with pagination)
- [ ] Switching between tabs preserves header state (no re-render flicker)
- [ ] FlowChart time range picker works independently (7d, 30d, 90d, 1y)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Remove Dead Code + Cleanup

### Overview
Delete the old catch-all route directory, remove VaultDetailsProvider/context and related hooks, remove unused utility functions, and clean up imports.

### Changes Required:

#### 1. Delete old catch-all route directory

**Delete entire directory**: `packages/web/src/app/vaults/[chainId]/[address]/[...tab]/`

This removes:
- `page.tsx` (old catch-all server component)
- `vault-details-page.tsx` (old client bridge)

#### 2. Delete old VaultDetails component

**Delete file**: `packages/web/src/vault-details/vault-details.tsx`

This was the old monolithic client component that rendered everything inside `VaultDetailsProvider`.

#### 3. Delete VaultDetailsProvider and context

**Delete file**: `packages/web/src/vault-details/vault-details.context.tsx`

#### 4. Delete useVaultDetails hook

**Delete file**: `packages/web/src/vault-details/hooks/use-vault-details.ts`

#### 5. Delete GlobalTimeSelector component

**Delete file**: `packages/web/src/vault-details/components/global-time-selector.tsx`

#### 6. Delete old VaultHeader component

**Delete file**: `packages/web/src/vault-details/components/vault-header.tsx`

#### 7. Delete old VaultOverview component

**Delete file**: `packages/web/src/vault-details/components/vault-overview.tsx`

#### 8. Delete old ExternalLinks component

**Delete file**: `packages/web/src/vault-details/components/external-links.tsx`

#### 9. Clean up vault-details.utils.ts

**File**: `packages/web/src/vault-details/vault-details.utils.ts`
**Changes**: Remove dead functions that are no longer used:

Remove:
- `generateExplorerUrl()` (lines 80-91) — replaced by `lib/get-explorer-address-url.ts`
- `generateDebankUrl()` (lines 93-95) — replaced by `lib/get-debank-profile-url.ts`
- `saveTimeRangeToLocalStorage()` (lines 59-65) — global time range removed
- `loadTimeRangeFromLocalStorage()` (lines 67-77) — global time range removed
- `TIME_RANGE_STORAGE_KEY` (line 57) — global time range removed
- `getTabFromUrl()` (lines 51-54) — no longer needed with route-based tabs
- `isValidTab()` (lines 41-43) — moved to vault-tabs.config.ts (already exists there)
- `VALID_TABS` (lines 11-16) — moved to vault-tabs.config.ts (already exists there)
- `DEFAULT_TAB` (line 8) — no longer needed
- Time range related: `VALID_TIME_RANGES`, `TIME_RANGE_LABELS`, `DEFAULT_TIME_RANGE`, `isValidTimeRange`

Keep:
- `isValidVaultParams()` (lines 30-38) — if still used elsewhere
- `formatVaultAge()` (lines 98-116) — may be used by vault metrics
- `formatDepositorCount()` (lines 119-127) — may be used by vault metrics
- `formatChartDate()` (lines 130-141) — may be used by flow chart

Verify each kept function is actually imported somewhere before keeping it.

#### 10. Delete vault-details.types.ts if only contains TimeRange

**File**: `packages/web/src/vault-details/vault-details.types.ts`
**Changes**: Check contents — if it only exports `TimeRange` type and that's no longer used, delete it. If it has other types still in use, keep those.

#### 11. Clean up vault-tabs.tsx re-exports

**File**: `packages/web/src/vault-details/components/vault-tabs.tsx`
**Changes**: If this file is no longer imported anywhere (replaced by `vault-detail-tabs.tsx`), delete it. The `vault-tabs.config.ts` file remains as the source of truth for tab configuration.

#### 12. Verify and remove unused imports

Run TypeScript compiler to find any broken imports after deletions, and fix them.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`
- [ ] No references to deleted files in remaining source: `grep -r "vault-details.context" packages/web/src/ --include="*.ts" --include="*.tsx"` returns nothing
- [ ] No references to `GlobalTimeSelector` in remaining source
- [ ] No references to `VaultDetailsProvider` in remaining source
- [ ] No references to old `VaultHeader` import path
- [ ] No references to `generateExplorerUrl` or `generateDebankUrl` from vault-details utils

#### Manual Verification:
- [ ] All vault pages still work after cleanup
- [ ] No console errors
- [ ] Navigate through all tabs — everything renders correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Mobile Responsiveness + Browser Testing

### Overview
Test all vault pages in browser using Playwright MCP at both desktop and mobile viewports. Fix any responsive layout issues. Ensure no horizontal scroll on mobile, proper space management, and above-the-fold focus for key content.

### Changes Required:

#### 1. Test desktop viewport

**URL**: `http://localhost:3000/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e`

Test checklist:
- Overview page renders correctly
- Depositors page renders correctly
- Activity page shows "Coming soon"
- Performance page shows "Coming soon"
- Breadcrumbs navigate correctly (SPA behavior)
- Tab navigation works (SPA behavior)
- External links open in new tab
- Block explorer copy button works
- VaultMetrics cards display in 4-column grid
- FlowChart renders with time picker
- DepositorsChart pie chart renders
- DepositorsList table renders with pagination

#### 2. Test mobile viewport (375px width)

**URL**: Same as desktop

Resize browser to 375x812 (iPhone viewport).

Test and fix:
- No horizontal scroll on any page
- Header stacks vertically (name/icons on one line, external links below)
- Tabs scroll horizontally
- VaultMetrics cards stack to single column
- FlowChart fits within viewport
- DepositorsChart is responsive
- DepositorsList adapts (may need to hide some columns or use card view)
- Breadcrumbs don't overflow

#### 3. Fix responsive issues found during testing

Common fixes needed:
- Add `overflow-x-auto` to tabs container (already done in VaultDetailTabs)
- Ensure `container` class doesn't add excessive padding on mobile
- Add responsive grid breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Ensure font sizes are appropriate on mobile (not too small or too large)
- Check that cards use `p-4` instead of `p-6` on mobile for space efficiency
- Ensure long addresses don't overflow (truncation should handle this)

#### 4. Test tablet viewport (768px width)

Resize to 768x1024 (iPad viewport).

Test:
- Layout transitions smoothly between mobile and desktop
- No awkward column widths or spacing
- Tabs don't wrap to multiple lines

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Desktop (1280px+): All content displays in optimal multi-column layout
- [ ] Tablet (768px): Content adapts with appropriate 2-column grids
- [ ] Mobile (375px): Single column, no horizontal scroll, content fits viewport
- [ ] Mobile: Key metrics visible above the fold without scrolling
- [ ] Mobile: Tabs are accessible via horizontal scroll
- [ ] Mobile: External links are compact and don't waste space
- [ ] Mobile: FlowChart is readable and interactive
- [ ] Mobile: DepositorsList is usable (address columns truncated appropriately)

**Implementation Note**: This phase involves iterative testing and fixing. Use Playwright MCP to take screenshots and snapshots at each viewport size, identify issues, fix them, and re-test.

---

## Testing Strategy

### Unit Tests:
- No new unit tests needed — changes are architectural (routing, component composition) rather than business logic

### Manual Testing Steps:
1. Start dev server: `cd packages/web && pnpm dev`
2. Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e` (overview)
3. Verify vault name, protocol, chain icon, token icon display
4. Verify breadcrumb SPA navigation (click "Vaults" → no page reload)
5. Click each tab → verify SPA navigation and correct content
6. Verify Etherscan link opens in new tab
7. Verify DeBank link opens in new tab with debank icon
8. Verify copy address button works
9. Navigate to `/vaults/1/0xB8a451107A9f87FDe481D4D686247D6e43Ed715e/depositors`
10. Verify depositors chart and table render
11. Test pagination in depositors table
12. Resize to mobile viewport (375px) — verify no horizontal scroll
13. Verify metrics cards stack vertically on mobile
14. Test all tabs at mobile viewport

## Performance Considerations

- **Server-side registry lookup** is near-instant — `getVaultFromRegistry()` uses a pre-built Map (O(1) lookup)
- **Route segments** enable per-tab code splitting — depositors chart JS not loaded on overview page
- **Removed wagmi RPC calls for name/protocol** — these are now served from static JSON, reducing client-side RPC load
- **VaultProvider** still uses wagmi for `asset`, `symbol`, `decimals` — these are needed for on-chain display formatting
- **Next.js Link prefetching** — tabs will be prefetched on hover, making tab switches feel instant

## Migration Notes

- The old `[...tab]` route is deleted entirely — no backwards compatibility needed since it's the same URL structure
- Old bookmarks/links to `/vaults/1/0x.../overview` will 404 since overview is now at `/vaults/1/0x.../` (base path). If this is a concern, a `overview/page.tsx` redirect can be added, but since this is an internal tool it's likely not needed.
- No database changes — API route handlers remain unchanged

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0017-qa-vault-page.md`
- Related FSN-0018 (activity tab): `thoughts/kuba/tickets/fsn_0018-implement-activity-tab-vault-page.md`
- Previous QA plan pattern: `thoughts/shared/plans/2026-02-06-FSN-0016-qa-vaults-list.md`
- Vault registry: `packages/web/src/lib/vaults-registry.ts`
- shadcn Breadcrumb: `packages/web/src/components/ui/breadcrumb.tsx`
- BlockExplorerAddress: `packages/web/src/components/ui/block-explorer-address.tsx`
- Existing link utils: `packages/web/src/lib/get-explorer-address-url.ts`, `packages/web/src/lib/get-debank-profile-url.ts`
- DeBank icon: `packages/web/public/assets/debank-icon.svg`
- Activity page pattern: `packages/web/src/app/activity/page.tsx` → `activity-server.tsx` → `activity-content.tsx`
