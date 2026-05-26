# Activity Page Implementation Plan

## Overview

Implement an activity page at `/activity` that displays all deposits and withdrawals across Fusion Vaults. The page will show a table with activity type, vault name with chain icon, USD amount, depositor address (with ENS, block explorer, and DeBank links), transaction hash (with block explorer link), and relative dates with absolute tooltips. Includes Total Inflows summary (1D, 7D, 30D) and discrete filtering with infinite scroll pagination.

## Current State Analysis

### Existing Infrastructure
- `depositEvent` table exists (`packages/ponder/ponder.schema.ts:11-20`) with chainId, vaultAddress, sender, receiver, assets, shares, timestamp
- `withdrawalEvent` table exists (`packages/ponder/ponder.schema.ts:22-32`) with same fields plus owner
- **Missing**: `transactionHash` field in both tables (needs schema migration)
- Event handlers at `packages/ponder/src/vaults/deposit.ts` and `withdraw.ts` capture events but don't store tx hash
- Vault directory (`packages/web/src/vault-directory/`) provides excellent patterns for server-side rendering, filtering, and TanStack Table

### Key Discoveries
- `packages/web/src/components/ui/block-explorer-address.tsx:26-117` - Existing address display with copy and block explorer links
- `packages/web/src/lib/get-explorer-address-url.ts:11-15` - Block explorer URL generation
- `packages/web/src/components/ui/tooltip.tsx` - Tooltip component for date hover
- `packages/ponder/src/api/vaults/vaults-list.ts` - Pattern for combining RPC + DB data with filtering/pagination
- DeBank profile URL pattern: `https://debank.com/profile/{address}`

## Desired End State

1. Activity page at `http://localhost:3000/activity` showing all vault deposits/withdrawals
2. Table columns: Activity Type | Vault (with chain icon) | Amount (USD) | Depositor | Tx Hash | Date
3. Total Inflows summary header (1D, 7D, 30D aggregates)
4. Filter dropdowns: Networks, Activity Type, Vaults, Value Ranges + wallet address text input
5. Infinite scroll with cursor-based pagination
6. Mobile-responsive table with horizontal scroll
7. Relative dates ("2 hours ago") with absolute date tooltip on hover

### Verification
- Activity page loads with real data from indexed events
- Filters work correctly and update URL params
- Infinite scroll loads more data on scroll
- All links (vault, block explorer, DeBank) work correctly
- Mobile view is usable with horizontal scroll

## What We're NOT Doing

- ENS avatars (just names as labels, no avatar images)
- Real-time updates/websockets (page refresh for new data)
- Export functionality (CSV, etc.)
- Advanced date range picker (just value-based filters)
- Sorting (always most recent first per ticket requirement)

## Implementation Approach

We'll build this in 4 phases:
1. Schema migration to add transactionHash
2. Backend API for activity list and inflows summary
3. Frontend activity page with table and filters
4. Infinite scroll and mobile optimization

---

## Phase 1: Schema Migration and Event Handler Updates

### Overview
Add `transactionHash` field to `depositEvent` and `withdrawalEvent` tables and update event handlers to capture it.

### Changes Required

#### 1. Update Ponder Schema
**File**: `packages/ponder/ponder.schema.ts`
**Changes**: Add transactionHash field to depositEvent and withdrawalEvent tables

```typescript
// Line 11-20: Update depositEvent
export const depositEvent = onchainTable('deposit_event', (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(), // ADD THIS
}));

// Line 22-32: Update withdrawalEvent
export const withdrawalEvent = onchainTable('withdrawal_event', (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  owner: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(), // ADD THIS
}));
```

#### 2. Update Deposit Event Handler
**File**: `packages/ponder/src/vaults/deposit.ts`
**Changes**: Capture transactionHash from event

```typescript
// Update lines 44-53
await context.db.insert(schema.depositEvent).values({
  id: event.id,
  chainId,
  vaultAddress,
  sender: event.args.caller,
  receiver: event.args.owner,
  assets: event.args.assets,
  shares: event.args.shares,
  timestamp: Number(timestamp),
  transactionHash: event.transaction.hash, // ADD THIS
});
```

#### 3. Update Withdraw Event Handler
**File**: `packages/ponder/src/vaults/withdraw.ts`
**Changes**: Capture transactionHash from event

```typescript
// Update lines 44-54
await context.db.insert(schema.withdrawalEvent).values({
  id: event.id,
  chainId,
  vaultAddress,
  sender: event.args.caller,
  owner: event.args.owner,
  receiver: event.args.receiver,
  assets: event.args.assets,
  shares: event.args.shares,
  timestamp: Number(timestamp),
  transactionHash: event.transaction.hash, // ADD THIS
});
```

### Success Criteria

#### Automated Verification:
- [ ] Ponder starts without errors: `cd packages/ponder && pnpm dev`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Schema generates correctly

#### Manual Verification:
- [ ] New events indexed include transactionHash field
- [ ] Query depositEvent and withdrawalEvent tables shows transactionHash

**Implementation Note**: After completing this phase, the indexer will need to re-index to populate transactionHash for historical events. Pause here to confirm indexing completes successfully before proceeding.

---

## Phase 2: Backend API - Activity Endpoint

### Overview
Create new API endpoints for activity list with cursor-based pagination and total inflows summary.

### Changes Required

#### 1. Create Activity API Router
**File**: `packages/ponder/src/api/activity/index.ts` (NEW)
**Changes**: New router for activity endpoints

```typescript
import { Hono } from 'hono';
import { activity } from './activity';
import { inflows } from './inflows';

export const activityRouter = new Hono();

activityRouter.route('/', activity);
activityRouter.route('/', inflows);
```

#### 2. Create Activity List Endpoint
**File**: `packages/ponder/src/api/activity/activity.ts` (NEW)
**Changes**: Main activity list endpoint with cursor-based pagination

Endpoint: `GET /api/activity`

Query parameters:
- `cursor` (optional): Cursor for pagination (timestamp:id format)
- `limit` (default: 50, max: 100): Items per page
- `chains` (optional): Comma-separated chain IDs
- `vaults` (optional): Comma-separated vault addresses
- `type` (optional): 'deposit' | 'withdraw' | 'all'
- `min_amount` (optional): Minimum USD amount filter
- `depositor` (optional): Filter by depositor address

Response format:
```typescript
{
  activities: [
    {
      id: string;
      type: 'deposit' | 'withdraw';
      chainId: number;
      vaultAddress: string;
      vaultName: string;
      depositorAddress: string;
      amount: string; // USD value
      assetAmount: string; // Raw asset amount
      assetSymbol: string;
      assetDecimals: number;
      transactionHash: string;
      timestamp: number;
    }
  ],
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  }
}
```

Implementation notes:
- Query both depositEvent and withdrawalEvent tables
- UNION ALL and ORDER BY timestamp DESC, id DESC
- Use (timestamp, id) as cursor for stable pagination
- Join with vault metadata for names
- Fetch asset info from RPC cache for USD conversion

#### 3. Create Inflows Summary Endpoint
**File**: `packages/ponder/src/api/activity/inflows.ts` (NEW)
**Changes**: Aggregated inflows for 1D, 7D, 30D

Endpoint: `GET /api/activity/inflows`

Query parameters:
- `chains` (optional): Comma-separated chain IDs to filter

Response format:
```typescript
{
  inflows: {
    day1: { deposits: string; withdrawals: string; net: string };
    day7: { deposits: string; withdrawals: string; net: string };
    day30: { deposits: string; withdrawals: string; net: string };
  }
}
```

Implementation notes:
- Use existing deposit/withdrawal bucket tables (1_DAY buckets)
- Aggregate across all vaults (or filtered by chain)
- Convert to USD using cached RPC data

#### 4. Create Activity Metadata Endpoint
**File**: `packages/ponder/src/api/activity/metadata.ts` (NEW)
**Changes**: Get available filter options

Endpoint: `GET /api/activity/metadata`

Response format:
```typescript
{
  chains: [{ chainId: number; name: string }],
  vaults: [{ chainId: number; address: string; name: string }]
}
```

#### 5. Register Activity Router
**File**: `packages/ponder/src/api/index.ts`
**Changes**: Add activity router

```typescript
import { activityRouter } from './activity';

// Add after line 16
app.route('/api/activity', activityRouter);
```

### Success Criteria

#### Automated Verification:
- [ ] API server starts: `cd packages/ponder && pnpm dev`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Activity endpoint returns data: `curl http://localhost:42069/api/activity`
- [ ] Inflows endpoint returns data: `curl http://localhost:42069/api/activity/inflows`
- [ ] Pagination works: Test with cursor parameter

#### Manual Verification:
- [ ] Activity list shows correct deposit/withdraw events
- [ ] Filters work correctly (chains, vaults, type, amount, depositor)
- [ ] Cursor pagination returns correct next page
- [ ] Inflows summary shows reasonable aggregates

**Implementation Note**: Test API thoroughly with different filter combinations before proceeding to frontend.

---

## Phase 3: Frontend - Activity Page

### Overview
Build the activity page with server-side data fetching, table display, and filter components.

### Changes Required

#### 1. Create Activity Data Fetching
**File**: `packages/web/src/activity/fetch-activity.ts` (NEW)
**Changes**: Server-side data fetching functions

```typescript
// Schemas and types
export interface ActivityItem {
  id: string;
  type: 'deposit' | 'withdraw';
  chainId: ChainId;
  vaultAddress: Address;
  vaultName: string;
  depositorAddress: Address;
  amount: number; // USD
  assetAmount: string;
  assetSymbol: string;
  transactionHash: Address;
  timestamp: number;
}

export interface ActivitySearchParams {
  chains?: string;
  vaults?: string;
  type?: string;
  min_amount?: string;
  depositor?: string;
}

// Functions
export async function fetchActivity(params: ActivitySearchParams, cursor?: string): Promise<ActivityResponse>
export async function fetchActivityInflows(chains?: string): Promise<InflowsResponse>
export async function fetchActivityMetadata(): Promise<ActivityMetadata>
```

#### 2. Create Activity Page Server Component
**File**: `packages/web/src/app/activity/page.tsx`
**Changes**: Replace placeholder with server component

```typescript
import { fetchActivity, fetchActivityInflows, fetchActivityMetadata, type ActivitySearchParams } from '@/activity/fetch-activity';
import { ActivityServer } from './activity-server';

export const metadata = {
  title: 'Activity - Fusion by wGenie',
};

interface PageProps {
  searchParams: Promise<ActivitySearchParams>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [activityData, inflowsData, metadataData] = await Promise.all([
    fetchActivity(params),
    fetchActivityInflows(params.chains),
    fetchActivityMetadata(),
  ]);

  return (
    <ActivityServer
      initialData={activityData}
      inflows={inflowsData}
      metadata={metadataData}
      searchParams={params}
    />
  );
}
```

#### 3. Create Activity Server Wrapper
**File**: `packages/web/src/app/activity/activity-server.tsx` (NEW)
**Changes**: Server component wrapper with header and content

```typescript
// Renders:
// - Total Inflows summary header
// - ActivityContent client component
```

#### 4. Create Activity Content Client Component
**File**: `packages/web/src/activity/activity-content.tsx` (NEW)
**Changes**: Client component with filters and table

```typescript
'use client';

// Renders:
// - Filter bar with dropdowns and wallet input
// - ActivityTable component
// - Infinite scroll trigger
```

#### 5. Create Activity Filter Components
**File**: `packages/web/src/activity/components/activity-filter-bar.tsx` (NEW)
**Changes**: Filter bar with dropdowns

Components needed:
- `NetworkFilter` - Dropdown for chain selection
- `ActivityTypeFilter` - Dropdown for deposit/withdraw
- `VaultFilter` - Dropdown for vault selection
- `ValueFilter` - Dropdown for min amount (>$100, >$1k, >$10k)
- `WalletInput` - Text input for depositor address

Pattern: Follow `packages/web/src/vault-directory/components/vault-filter-popover.tsx` for URL param updates

#### 6. Create Activity Table
**File**: `packages/web/src/activity/components/activity-table.tsx` (NEW)
**Changes**: TanStack Table for activity display

#### 7. Create Activity Columns
**File**: `packages/web/src/activity/components/activity-columns.tsx` (NEW)
**Changes**: Column definitions

Columns:
1. **Type + Chain**: Chain icon + "Add"/"Remove" badge
2. **Vault**: Vault name as link to `/vaults/{chainId}/{address}`
3. **Amount**: USD formatted (e.g., "$1,234.56")
4. **Depositor**: Truncated address with ENS label, copy button, block explorer link, DeBank link
5. **Tx Hash**: Truncated hash with block explorer link
6. **Date**: Relative time ("2 hours ago") with absolute date tooltip

#### 8. Create Total Inflows Summary
**File**: `packages/web/src/activity/components/total-inflows.tsx` (NEW)
**Changes**: Header summary component

```typescript
// Displays:
// Total Inflows
// 1D: $16K  7D: $824K  30D: $6.6M
```

#### 9. Create Relative Date Component
**File**: `packages/web/src/activity/components/relative-date.tsx` (NEW)
**Changes**: Relative date with tooltip

```typescript
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';

export function RelativeDate({ timestamp }: { timestamp: number }) {
  const date = new Date(timestamp * 1000);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy h:mm a');

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default">
        <span className="text-muted-foreground">{relative}</span>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
```

#### 10. Create Transaction Hash Link Component
**File**: `packages/web/src/activity/components/tx-hash-link.tsx` (NEW)
**Changes**: Transaction hash with block explorer link

```typescript
// Similar to BlockExplorerAddress but for transactions
// URL: {explorer}/tx/{hash}
```

#### 11. Add Transaction URL Helper
**File**: `packages/web/src/lib/get-explorer-tx-url.ts` (NEW)
**Changes**: Generate block explorer transaction URL

```typescript
export const getExplorerTxUrl = (txHash: Address, chainId: ChainId) => {
  const chain = getChainById(chainId);
  return `${chain.blockExplorers.default.url}/tx/${txHash}`;
};
```

#### 12. Add DeBank Profile URL Helper
**File**: `packages/web/src/lib/get-debank-profile-url.ts` (NEW)
**Changes**: Generate DeBank profile URL

```typescript
export const getDebankProfileUrl = (address: Address) => {
  return `https://debank.com/profile/${address}`;
};
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Page renders without errors: `pnpm dev` and visit `/activity`

#### Manual Verification:
- [ ] Activity table displays data correctly
- [ ] All filters update URL and filter data
- [ ] Vault name links to correct vault page
- [ ] Block explorer links work for addresses and tx hashes
- [ ] DeBank links open correct profiles
- [ ] Relative dates show correctly with absolute tooltip on hover
- [ ] Total Inflows summary shows correct values

**Implementation Note**: Test all link types and filter combinations before proceeding to infinite scroll.

---

## Phase 4: Infinite Scroll and Mobile Optimization

### Overview
Implement cursor-based infinite scroll and ensure mobile responsiveness.

### Changes Required

#### 1. Create Infinite Scroll Hook
**File**: `packages/web/src/activity/hooks/use-infinite-activity.ts` (NEW)
**Changes**: TanStack Query infinite query hook

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteActivity(params: ActivitySearchParams) {
  return useInfiniteQuery({
    queryKey: ['activity', params],
    queryFn: ({ pageParam }) => fetchActivityClient(params, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

#### 2. Create Client-Side Fetch Function
**File**: `packages/web/src/activity/fetch-activity-client.ts` (NEW)
**Changes**: Client-side API fetch for pagination

```typescript
import { apiClient } from '@/lib/api-client';

export async function fetchActivityClient(
  params: ActivitySearchParams,
  cursor?: string
): Promise<ActivityResponse> {
  const searchParams = new URLSearchParams();
  if (cursor) searchParams.set('cursor', cursor);
  // ... add other params

  const response = await apiClient.get(`/api/activity?${searchParams}`);
  return activityResponseSchema.parse(response.data);
}
```

#### 3. Add Intersection Observer for Scroll Trigger
**File**: `packages/web/src/activity/components/activity-scroll-trigger.tsx` (NEW)
**Changes**: Intersection observer to trigger loading more

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

export function ActivityScrollTrigger({
  onLoadMore,
  hasMore,
  isLoading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}) {
  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <div ref={ref} className="h-10 flex items-center justify-center">
      {isLoading && <Spinner />}
    </div>
  );
}
```

#### 4. Update Activity Content for Infinite Scroll
**File**: `packages/web/src/activity/activity-content.tsx`
**Changes**: Integrate infinite query and scroll trigger

#### 5. Mobile Responsive Table
**File**: `packages/web/src/activity/components/activity-table.tsx`
**Changes**: Ensure horizontal scroll on mobile

```typescript
// Wrapper div with overflow-x-auto
// Minimum table width for readable columns
// Touch-friendly tap targets
```

#### 6. Install react-intersection-observer
**File**: `packages/web/package.json`
**Changes**: Add dependency if not present

```bash
cd packages/web && pnpm add react-intersection-observer
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Dependencies install: `pnpm install`
- [ ] No console errors during infinite scroll

#### Manual Verification:
- [ ] Scrolling to bottom loads more data
- [ ] Loading indicator shows while fetching
- [ ] Stops loading when no more data
- [ ] Works with filters applied
- [ ] Mobile: Table scrolls horizontally
- [ ] Mobile: Filters are usable
- [ ] Mobile: Touch scrolling works smoothly

**Implementation Note**: Test on actual mobile device or Chrome DevTools mobile emulation.

---

## Testing Strategy

### Unit Tests
- Activity data fetching functions
- Cursor pagination logic
- Date formatting utilities
- URL parameter parsing

### Integration Tests
- API endpoints return correct data
- Filters produce correct queries
- Pagination cursors work correctly

### Manual Testing Steps
1. Load activity page - verify table shows data
2. Apply each filter individually - verify correct filtering
3. Apply multiple filters - verify combined filtering
4. Scroll to load more - verify infinite scroll
5. Click vault name - verify navigation to vault page
6. Click depositor address - verify block explorer opens
7. Click DeBank icon - verify DeBank profile opens
8. Click tx hash - verify block explorer tx page opens
9. Hover on date - verify tooltip shows absolute date
10. Test on mobile viewport - verify horizontal scroll and usability

## Performance Considerations

- Server-side rendering for initial load (SEO and performance)
- Cursor-based pagination to avoid offset performance issues
- 30-second stale time to reduce API calls
- Minimal re-renders with proper React Query setup
- Lazy loading for table rows below fold

## Migration Notes

- Schema change requires Ponder re-indexing
- Historical events will get transactionHash populated during re-index
- No database migration scripts needed (Ponder handles schema changes)

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0009.md`
- Design reference: https://fusion-tracker.figma.site/
- Vault directory pattern: `packages/web/src/vault-directory/`
- Ponder schema: `packages/ponder/ponder.schema.ts`
- Block explorer component: `packages/web/src/components/ui/block-explorer-address.tsx`
