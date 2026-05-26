# FSN-0014: Fix Issues and Refactor Activity List Page

## Overview

Fix and refactor the Activity list page UI: update table column content/layout, improve filter components, fix total inflows coloring, and port the `TokenIcon` component from wgenie-webapp into packages/web.

## Current State Analysis

- **Activity table** (`activity-columns.tsx`): 6 columns — Activity (chain icon + "Add"/"Remove" badge), Vault (name link), Amount (formatted currency), Depositor (custom `DepositorAddress` component), Tx Hash (truncated hash), Date
- **Depositor display** (`depositor-address.tsx`): Custom component with copy/explorer link but NO ENS name, NO avatar, NO Safe detection
- **Filters** (`activity-filter-bar.tsx`): All `<Select>` dropdowns — network, activity type ("Add Liquidity"/"Remove Liquidity"), vault (name only), min amount, depositor search
- **Total Inflows** (`total-inflows.tsx`): Always green text, no negative color handling
- **No TokenIcon component** in packages/web — needs porting from wgenie-webapp
- **ActivityItem schema** doesn't include `assetAddress` — needs adding for TokenIcon

### Key Discoveries:

- `Account` component at `packages/web/src/account/account.tsx` already handles ENS name, ENS avatar, Safe wallet detection, and block explorer links — should replace `DepositorAddress`
- `ToggleGroup` component already installed at `packages/web/src/components/ui/toggle-group.tsx`
- Vault metadata doesn't include `assetAddress` or `assetSymbol` — needs enrichment for vault filter icons
- `VaultRpcData` provides `assetAddress` and `assetSymbol` during activity enrichment (line 234-249 in `fetch-activity.ts`)
- Token icon API URLs: `https://assets.mainnet.wGenie.io` (fetching), `https://api-assets.mainnet.wGenie.io` (creation) — hardcode these
- The `Account` component requires `AppProviders` (wagmi) wrapping — already provided in `activity-server.tsx`

## Desired End State

After implementation:
1. Activity column shows only "Deposit"/"Withdrawal" badge text (no chain icon)
2. Vault column shows chain icon + token icon + vault name
3. Amount column shows asset amount with symbol (e.g., "1,000 USDC")
4. Depositor column uses shared `Account` component with ENS, avatar, Safe detection
5. Transaction column header says "Transaction", cell shows "View Tx" link
6. Activity type filter labels: "Deposits", "Withdrawals"
7. Vault filter shows chain icon + asset icon next to vault name
8. Value filter uses ToggleGroup instead of Select
9. Total Inflows shows red color for negative values
10. TokenIcon component exists in packages/web, fetching from hardcoded wGenie assets API

### Verification:
- Visual verification at http://localhost:3000/activity using Playwright
- TypeScript compiles: `pnpm --filter web typecheck`

## What We're NOT Doing

- NOT adding USD price conversion (keeping raw asset amounts)
- NOT adding new environment variables (hardcoding API URLs)
- NOT refactoring the data fetching layer or API route
- NOT changing infinite scroll or pagination behavior
- NOT adding ENS to the activity data model server-side (Account component fetches client-side)

## Implementation Approach

Work in 4 phases: first port TokenIcon (new dependency), then update columns (biggest visual change), then filters, then inflows fix. Each phase is independently testable.

---

## Phase 1: Port TokenIcon Component

### Overview
Port `TokenIcon` from wgenie-webapp into packages/web with hardcoded API URLs. This is a prerequisite for Phase 2 (vault column needs asset icon).

### Changes Required:

#### 1. Create TokenIcon component

**File**: `packages/web/src/components/token-icon/token-icon.tsx` (NEW)

Port from `/Users/kuba/wgenie-labs/wgenie-webapp/src/tokens/TokenIcon.tsx` with these modifications:
- Replace `ENV_CONFIG.ASSETS_API_URL` with hardcoded `'https://assets.mainnet.wGenie.io'`
- Replace `ENV_CONFIG.CREATE_ICON_API_URL` with hardcoded `'https://api-assets.mainnet.wGenie.io'`
- Replace `ENV_CONFIG.CREATE_ICON_API_KEY` with hardcoded `'VmnFCf1qiS254TLZmxFcY6g5Y7gy0mL112zYrY7v'`
- Replace `ChainId` type import with `number` (packages/web doesn't have wagmi's ChainId enum)
- Replace `cn` import path to `@/lib/utils`
- Keep `useReadContract` from wagmi for symbol lookup
- Keep `useQuery` from `@tanstack/react-query`
- Add `'use client'` directive

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Address, erc20Abi } from 'viem';
import { useReadContract } from 'wagmi';

const ASSETS_API_URL = 'https://assets.mainnet.wGenie.io';
const CREATE_ICON_API_URL = 'https://api-assets.mainnet.wGenie.io';
const CREATE_ICON_API_KEY = 'VmnFCf1qiS254TLZmxFcY6g5Y7gy0mL112zYrY7v';

// ... rest follows the same structure as wgenie-webapp TokenIcon
// with URL constants replaced inline
```

#### 2. Create barrel export

**File**: `packages/web/src/components/token-icon/index.ts` (NEW)

```typescript
export { TokenIcon } from './token-icon';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] File exists: `packages/web/src/components/token-icon/token-icon.tsx`

#### Manual Verification:
- [ ] TokenIcon renders correctly when used in Phase 2

**Implementation Note**: After completing this phase and all automated verification passes, proceed to Phase 2. Manual verification happens together with Phase 2.

---

## Phase 2: Update Activity Table Columns

### Overview
Update all 6 columns per ticket requirements: badge text, move chain icon, add token icon, replace depositor component, update tx hash display.

### Changes Required:

#### 1. Add `assetAddress` to ActivityItem schema and enrichment

**File**: `packages/web/src/activity/fetch-activity.ts`

Add `assetAddress` to the `activityItemSchema`:
```typescript
const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['deposit', 'withdraw']),
  chainId: z.number(),
  vaultAddress: addressSchema,
  vaultName: z.string(),
  depositorAddress: addressSchema,
  amount: z.number(),
  assetAmount: z.string(),
  assetSymbol: z.string(),
  assetAddress: addressSchema,  // ADD THIS
  assetDecimals: z.number(),
  transactionHash: txHashSchema,
  timestamp: z.number(),
});
```

In the enrichment map (line ~240), add:
```typescript
assetAddress: (rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000') as Address,
```

#### 2. Add `assetAddress` to API route enrichment

**File**: `packages/web/src/app/api/activity/route.ts`

Same change — add `assetAddress` to the enriched activity object in the map (line ~170):
```typescript
assetAddress: rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000',
```

#### 3. Update activity-columns.tsx

**File**: `packages/web/src/activity/components/activity-columns.tsx`

Replace entire column definitions:

```typescript
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import Link from 'next/link';
import type { ActivityItem } from '../fetch-activity';
import { RelativeDate } from './relative-date';
import { Account } from '@/account/account';
import type { ChainId } from '@/app/wagmi-provider';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}

export function createActivityColumns(): ColumnDef<ActivityItem>[] {
  return [
    {
      id: 'type',
      header: () => 'Activity',
      cell: ({ row }) => {
        const isDeposit = row.original.type === 'deposit';
        return (
          <Badge
            variant={isDeposit ? 'default' : 'secondary'}
            className={
              isDeposit
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }
          >
            {isDeposit ? 'Deposit' : 'Withdrawal'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'vaultName',
      header: () => 'Vault',
      cell: ({ row }) => {
        const { chainId, vaultAddress, vaultName, assetAddress } = row.original;
        return (
          <div className="flex items-center gap-2">
            <ChainIcon chainId={chainId} className="w-5 h-5" />
            <TokenIcon
              chainId={chainId}
              address={assetAddress}
              className="w-5 h-5"
            />
            <Link
              href={`/vaults/${chainId}/${vaultAddress}`}
              className="text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors font-medium"
            >
              {vaultName}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {formatCurrency(row.original.amount)}
          <span className="text-muted-foreground ml-1">
            {row.original.assetSymbol}
          </span>
        </div>
      ),
    },
    {
      id: 'depositor',
      header: () => 'Depositor',
      cell: ({ row }) => (
        <Account
          address={row.original.depositorAddress}
          chainId={row.original.chainId as ChainId}
        />
      ),
    },
    {
      id: 'txHash',
      header: () => 'Transaction',
      cell: ({ row }) => {
        const { transactionHash, chainId } = row.original;
        const getExplorerUrl = () => {
          const explorers: Record<number, string> = {
            1: 'https://etherscan.io',
            42161: 'https://arbiscan.io',
            8453: 'https://basescan.org',
            130: 'https://uniscan.xyz',
            43114: 'https://snowtrace.io',
          };
          const baseUrl = explorers[chainId] || 'https://etherscan.io';
          return `${baseUrl}/tx/${transactionHash}`;
        };
        return (
          <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
          >
            View Tx
          </a>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: () => <div className="text-right">Date</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <RelativeDate timestamp={row.original.timestamp} />
        </div>
      ),
    },
  ];
}
```

**Note**: Check if `ChainId` type is exported from `@/app/wagmi-provider` — if not, cast `chainId` as needed. The `Account` component accepts `chainId: ChainId` where `ChainId` is a union of supported chain IDs.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`

#### Manual Verification:
- [ ] Activity column shows "Deposit" / "Withdrawal" badges (no chain icon)
- [ ] Vault column shows chain icon + token icon + vault name link
- [ ] Amount shows value with asset symbol (e.g., "1,000.00 USDC")
- [ ] Depositor shows avatar + ENS name (or truncated address) + copy button + explorer link
- [ ] Transaction column header says "Transaction", cells show "View Tx" link to block explorer
- [ ] Token icons load correctly (show image or placeholder with symbol)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Update Filters

### Overview
Update activity type labels, add icons to vault filter, and replace value filter Select with ToggleGroup.

### Changes Required:

#### 1. Add `assetAddress` and `assetSymbol` to vault metadata

**File**: `packages/web/src/activity/fetch-activity.ts`

Update `vaultMetadataSchema`:
```typescript
const vaultMetadataSchema = z.object({
  chainId: z.number(),
  address: addressSchema,
  name: z.string(),
  assetAddress: addressSchema,   // ADD
  assetSymbol: z.string(),       // ADD
});
```

Update `fetchActivityMetadata()` to enrich vaults with RPC data:
```typescript
export async function fetchActivityMetadata(): Promise<ActivityMetadata> {
  const vaultChainIds = new Set(ERC4626_VAULTS.map((v) => v.chainId));

  const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    8453: 'Base',
    43114: 'Avalanche',
    130: 'Unichain',
    9745: 'Sonic',
  };

  const chainList = Array.from(vaultChainIds)
    .sort((a, b) => a - b)
    .map((chainId) => ({
      chainId,
      name: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    }));

  // Fetch RPC data for asset info
  const vaultsForRpc = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address,
  }));
  const rpcDataMap = await fetchAllVaultsRpcData(vaultsForRpc);

  const vaultList = ERC4626_VAULTS.map((vault) => {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const rpcData = rpcDataMap.get(rpcKey);
    return {
      chainId: vault.chainId,
      address: vault.address as Address,
      name: vault.name,
      assetAddress: (rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000') as Address,
      assetSymbol: rpcData?.assetSymbol ?? 'UNKNOWN',
    };
  });

  return activityMetadataSchema.parse({
    chains: chainList,
    vaults: vaultList,
  });
}
```

#### 2. Update activity-filter-bar.tsx

**File**: `packages/web/src/activity/components/activity-filter-bar.tsx`

Key changes:
- Change activity type labels from "Add Liquidity"/"Remove Liquidity" to "Deposits"/"Withdrawals"
- Add `ChainIcon` and `TokenIcon` to vault filter `SelectItem`s
- Replace value filter `Select` with `ToggleGroup`

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import type { ActivityMetadata, ActivitySearchParams } from '../fetch-activity';

interface Props {
  metadata: ActivityMetadata;
  searchParams: ActivitySearchParams;
}

export function ActivityFilterBar({ metadata, searchParams }: Props) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [depositorInput, setDepositorInput] = useState(searchParams.depositor || '');

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // ... handlers stay the same ...

  const handleMinAmountChange = (value: string) => {
    updateFilters({ min_amount: value === 'all' ? null : value });
  };

  // ... rest stays same, but change:

  // Activity Type filter labels:
  // <SelectItem value="deposit">Deposits</SelectItem>
  // <SelectItem value="withdraw">Withdrawals</SelectItem>

  // Vault filter items with icons:
  // {metadata.vaults.map((vault) => (
  //   <SelectItem key={vault.address} value={vault.address.toLowerCase()}>
  //     <div className="flex items-center gap-2">
  //       <ChainIcon chainId={vault.chainId} className="w-4 h-4" />
  //       <TokenIcon chainId={vault.chainId} address={vault.assetAddress} className="w-4 h-4" />
  //       <span>{vault.name}</span>
  //     </div>
  //   </SelectItem>
  // ))}

  // Replace Min Amount Select with ToggleGroup:
  // <ToggleGroup
  //   type="single"
  //   variant="outline"
  //   value={currentMinAmount}
  //   onValueChange={(value) => handleMinAmountChange(value || 'all')}
  //   disabled={isPending}
  // >
  //   <ToggleGroupItem value="all">All</ToggleGroupItem>
  //   <ToggleGroupItem value="100">&gt;$100</ToggleGroupItem>
  //   <ToggleGroupItem value="1000">&gt;$1K</ToggleGroupItem>
  //   <ToggleGroupItem value="10000">&gt;$10K</ToggleGroupItem>
  // </ToggleGroup>
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`

#### Manual Verification:
- [ ] Activity type filter shows "Deposits" / "Withdrawals"
- [ ] Vault filter items show chain icon + token icon + name
- [ ] Value filter renders as ToggleGroup with All / >$100 / >$1K / >$10K options
- [ ] All filters still work correctly (URL params update, data filters)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Fix Total Inflows Colors

### Overview
Add red color for negative inflow values.

### Changes Required:

#### 1. Update total-inflows.tsx

**File**: `packages/web/src/activity/components/total-inflows.tsx`

Change the hardcoded `text-green-500` to conditionally use red for negative values:

```typescript
function getColorClass(value: number): string {
  return value >= 0 ? 'text-green-500' : 'text-red-500';
}

// Then in JSX for each period:
<span className={`font-medium ${getColorClass(inflows.day1.net)}`}>
  {formatCompactCurrency(inflows.day1.net)}
</span>
```

Apply this pattern to all three periods (day1, day7, day30).

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`

#### Manual Verification:
- [ ] Positive inflow values show in green
- [ ] Negative inflow values show in red

**Implementation Note**: After completing this phase, proceed to Phase 5 for full visual testing.

---

## Phase 5: Visual Testing with Playwright

### Overview
Use Playwright MCP to verify all changes visually at http://localhost:3000/activity.

### Testing Steps:
1. Navigate to http://localhost:3000/activity
2. Take screenshot and verify:
   - Activity column: badges say "Deposit" / "Withdrawal" (no chain icon)
   - Vault column: chain icon + token icon + vault name link
   - Amount: shows value with asset symbol
   - Depositor: avatar + address/ENS name
   - Transaction: "View Tx" links
   - Total Inflows: red/green colors
3. Test filters:
   - Activity type filter labels
   - Vault filter with icons
   - ToggleGroup value filter
4. Click a "View Tx" link to verify it opens block explorer
5. Verify depositor shows ENS names and Safe wallet icons where applicable

### Success Criteria:

#### Manual Verification:
- [ ] All column changes render correctly
- [ ] All filter changes work correctly
- [ ] Total inflows colors are correct
- [ ] No layout/overflow issues
- [ ] Mobile responsiveness maintained (check horizontal scroll)

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `packages/web/src/components/token-icon/token-icon.tsx` | CREATE | 1 |
| `packages/web/src/components/token-icon/index.ts` | CREATE | 1 |
| `packages/web/src/activity/fetch-activity.ts` | MODIFY (add assetAddress to schema + enrichment + metadata) | 2, 3 |
| `packages/web/src/app/api/activity/route.ts` | MODIFY (add assetAddress to enrichment) | 2 |
| `packages/web/src/activity/components/activity-columns.tsx` | MODIFY (rewrite columns) | 2 |
| `packages/web/src/activity/components/activity-filter-bar.tsx` | MODIFY (labels, icons, toggle group) | 3 |
| `packages/web/src/activity/components/total-inflows.tsx` | MODIFY (conditional color) | 4 |

## Cleanup Candidates

After implementation, these files may become unused:
- `packages/web/src/activity/components/depositor-address.tsx` — replaced by `Account` component
- `packages/web/src/activity/components/tx-hash-link.tsx` — replaced by inline "View Tx" link

Check if they're used elsewhere before deleting.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0014-activity-tab-fix-issues.md`
- TokenIcon source: `/Users/kuba/wgenie-labs/wgenie-webapp/src/tokens/TokenIcon.tsx`
- Account component: `packages/web/src/account/account.tsx`
- ToggleGroup example: `packages/web/src/vault-directory/components/filters/net-flow-filter.tsx`
