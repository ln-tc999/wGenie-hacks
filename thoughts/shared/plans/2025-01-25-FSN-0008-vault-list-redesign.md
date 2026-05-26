# Vault List Page Redesign Implementation Plan

## Overview

Redesign and refactor the vault list page to improve user experience, adopt Next.js best practices (Server Components), implement TanStack Table for sortable columns, create a discrete filter UI, and update branding from "DeFi Panda" to "Fusion (by wGenie)".

## Current State Analysis

### Architecture
- **Client-side rendering**: Page uses `'use client'` with React Query for data fetching
- **State management**: Filters/sort/page stored in URL params + localStorage
- **Table**: Manual implementation without TanStack Table
- **Filters**: Large Card component taking significant vertical space
- **Navigation**: Uses `window.location.href` instead of `<Link>`
- **Branding**: "DeFi Panda" appears in 5 code locations

### Key Files
- `packages/web/src/app/vaults/page.tsx` - Next.js page route
- `packages/web/src/app/vaults/vault-directory-page.tsx` - Client component wrapper
- `packages/web/src/vault-directory/vault-directory.tsx` - Main component
- `packages/web/src/vault-directory/components/vault-filters.tsx` - Filter Card
- `packages/web/src/vault-directory/components/vault-table-header.tsx` - Static headers
- `packages/web/src/vault-directory/components/vault-table-row.tsx` - Table rows with onClick
- `packages/web/src/vault-directory/hooks/use-vault-directory.ts` - State management hook

## Desired End State

1. **Server Components**: Data fetched server-side, no React Query for vault data
2. **URL-based state**: All filters, sort, and pagination via URL search params only
3. **TanStack Table**: Sortable column headers with visual indicators
4. **Discrete filters**: Single "Filters" button opening a popover with all controls
5. **Proper links**: Table rows use `<Link>` components for navigation
6. **Mobile responsive**: Horizontal scroll for table on small screens
7. **Updated branding**: "Fusion (by wGenie)" with new logo

### Verification
- Page loads with server-rendered data (check page source)
- Clicking column headers updates URL and re-sorts
- Filter popover shows all 6 filter controls
- Active filters shown as count on button
- Table rows are actual `<a>` tags (inspect element)
- Table scrolls horizontally on mobile
- Logo and app name show "Fusion (by wGenie)"

## What We're NOT Doing

- Not implementing client-side caching (removed React Query for vaults)
- Not keeping localStorage persistence for filters
- Not adding TanStack Table features beyond sorting (no column visibility, row selection)
- Not changing the API backend
- Not updating documentation files (.ai/*.md, README.md) - only code files

## Implementation Approach

Move from client-side React Query architecture to Next.js Server Components with URL-based state. This simplifies the codebase significantly while improving SEO and initial load performance.

---

## Phase 1: Install Dependencies and Update Branding

### Overview
Add TanStack Table dependency and update all branding references.

### Changes Required:

#### 1. Install TanStack Table
**Command**:
```bash
cd packages/web && npm install @tanstack/react-table
```

#### 2. Update Root Layout Metadata
**File**: `packages/web/src/app/layout.tsx`
**Changes**: Update title, description, and favicon

```tsx
import type { Metadata } from 'next';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'Fusion by wGenie',
  description: 'ERC4626 Vault Analytics Dashboard',
  icons: {
    icon: '/assets/logo-fusion-by-wGenie.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

#### 3. Update Vaults Page Metadata
**File**: `packages/web/src/app/vaults/page.tsx`
**Changes**: Update title

```tsx
export const metadata = {
  title: 'Vault Directory - Fusion by wGenie',
};
```

#### 4. Update App Sidebar Branding
**File**: `packages/web/src/components/sidebar/app-sidebar.tsx`
**Changes**: Update logo and app name

```tsx
<SidebarHeader>
  <div className="flex items-center gap-2 px-2 py-2">
    <img
      src="/assets/logo-fusion-by-wGenie.svg"
      alt="Fusion by wGenie"
      className="h-8 w-8"
    />
    <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
      Fusion
    </span>
  </div>
</SidebarHeader>
```

#### 5. Update Sidebar Layout Mobile Header
**File**: `packages/web/src/components/sidebar/sidebar-layout.tsx`
**Changes**: Update mobile header text

```tsx
<span className="font-semibold md:hidden">Fusion</span>
```

#### 6. Update Other Page Titles
**File**: `packages/web/src/app/activity/page.tsx`
**Changes**: Update title to use new branding

**File**: `packages/web/src/app/vaults/[chainId]/[address]/[...tab]/page.tsx`
**Changes**: Update title template to use new branding

### Success Criteria:

#### Automated Verification:
- [ ] Dependencies install successfully: `cd packages/web && npm install`
- [ ] TypeScript compiles: `cd packages/web && npm run build`
- [ ] No linting errors: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] Logo displays correctly in sidebar
- [ ] "Fusion" text appears in sidebar and mobile header
- [ ] Page titles show "Fusion by wGenie" in browser tab

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Create Server-Side Data Fetching

### Overview
Replace React Query with server-side fetch in a Server Component.

### Changes Required:

#### 1. Create Server-Side Fetch Utility
**File**: `packages/web/src/vault-directory/fetch-vaults.ts` (new file)
**Changes**: Create server-side fetch function

```typescript
import { z } from 'zod';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

// Reuse existing schemas from use-vaults-query.ts
const VaultDataSchema = z.object({
  address: z.string(),
  name: z.string(),
  chainId: z.number(),
  underlyingAsset: z.string(),
  tvl: z.number(),
  depositorCount: z.number(),
  netFlow7d: z.number(),
  creationDate: z.coerce.date(),
});

const VaultsResponseSchema = z.object({
  vaults: z.array(VaultDataSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  }),
});

export type VaultData = z.infer<typeof VaultDataSchema>;
export type VaultsResponse = z.infer<typeof VaultsResponseSchema>;

export interface VaultSearchParams {
  page?: string;
  sort?: string;
  tvl_min?: string;
  tvl_max?: string;
  depositors_min?: string;
  depositors_max?: string;
  net_flow?: string;
  underlying_assets?: string;
  chains?: string;
  protocols?: string;
}

export async function fetchVaults(
  searchParams: VaultSearchParams
): Promise<VaultsResponse> {
  const params = new URLSearchParams();

  params.set('page', searchParams.page || '1');
  params.set('limit', '20');
  params.set('sort', searchParams.sort || 'tvl');

  if (searchParams.tvl_min) params.set('tvl_min', searchParams.tvl_min);
  if (searchParams.tvl_max) params.set('tvl_max', searchParams.tvl_max);
  if (searchParams.depositors_min) params.set('depositors_min', searchParams.depositors_min);
  if (searchParams.depositors_max) params.set('depositors_max', searchParams.depositors_max);
  if (searchParams.net_flow) params.set('net_flow', searchParams.net_flow);
  if (searchParams.underlying_assets) params.set('underlying_assets', searchParams.underlying_assets);
  if (searchParams.chains) params.set('chains', searchParams.chains);
  if (searchParams.protocols) params.set('protocols', searchParams.protocols);

  const response = await fetch(`${API_URL}/api/vaults?${params.toString()}`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vaults: ${response.statusText}`);
  }

  const data = await response.json();
  return VaultsResponseSchema.parse(data);
}

export async function fetchVaultsMetadata() {
  const response = await fetch(`${API_URL}/api/vaults/metadata`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }

  return response.json();
}
```

#### 2. Update Environment Configuration
**File**: `packages/web/next.config.ts`
**Changes**: Ensure API_URL is available server-side (verify `env` configuration if needed)

#### 3. Update Vaults Page to Server Component
**File**: `packages/web/src/app/vaults/page.tsx`
**Changes**: Convert to async Server Component

```tsx
import { fetchVaults, fetchVaultsMetadata, type VaultSearchParams } from '@/vault-directory/fetch-vaults';
import { VaultDirectoryServer } from './vault-directory-server';

export const metadata = {
  title: 'Vault Directory - Fusion by wGenie',
};

interface PageProps {
  searchParams: Promise<VaultSearchParams>;
}

export default async function VaultsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [vaultsData, metadata] = await Promise.all([
    fetchVaults(params),
    fetchVaultsMetadata(),
  ]);

  return (
    <VaultDirectoryServer
      initialData={vaultsData}
      metadata={metadata}
      searchParams={params}
    />
  );
}
```

#### 4. Create Server Directory Component
**File**: `packages/web/src/app/vaults/vault-directory-server.tsx` (new file)
**Changes**: Create wrapper that passes data to client components

```tsx
import type { VaultsResponse, VaultSearchParams } from '@/vault-directory/fetch-vaults';
import { VaultDirectoryContent } from '@/vault-directory/vault-directory-content';

interface Props {
  initialData: VaultsResponse;
  metadata: any;
  searchParams: VaultSearchParams;
}

export function VaultDirectoryServer({ initialData, metadata, searchParams }: Props) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Vault Directory
          </h1>
          <p className="text-muted-foreground">
            Discover and analyze ERC4626 vaults across the DeFi ecosystem
          </p>
        </div>
        <VaultDirectoryContent
          vaults={initialData.vaults}
          pagination={initialData.pagination}
          metadata={metadata}
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npm run build`
- [ ] Page renders without errors: `cd packages/web && npm run dev` then visit /vaults

#### Manual Verification:
- [ ] View page source shows vault data (server-rendered)
- [ ] Page loads with vault list visible
- [ ] No "Loading..." flash on initial page load

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Implement TanStack Table with Sortable Headers

### Overview
Create a new table component using TanStack Table with clickable sortable column headers.

### Changes Required:

#### 1. Create Vault Table Columns Definition
**File**: `packages/web/src/vault-directory/components/vault-columns.tsx` (new file)
**Changes**: Define column configuration with sortable headers

```tsx
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChainIcon } from '@/components/chain-icon';
import { formatCurrency } from '@/lib/utils';
import type { VaultData } from '@/vault-directory/fetch-vaults';
import Link from 'next/link';

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: string;
  align?: 'left' | 'right';
}

export function SortableHeader({ column, label, currentSort, align = 'left' }: SortableHeaderProps) {
  const isActive = currentSort === column;
  const Icon = isActive ? ArrowDown : ArrowUpDown;

  return (
    <Link
      href={`?sort=${column}`}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        align === 'right' ? 'justify-end w-full' : ''
      }`}
    >
      {label}
      <Icon className={`h-4 w-4 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
    </Link>
  );
}

export function createColumns(currentSort: string): ColumnDef<VaultData>[] {
  return [
    {
      accessorKey: 'underlyingAsset',
      header: () => 'Asset',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ChainIcon chainId={row.original.chainId} className="w-5 h-5" />
          <Badge variant="secondary">{row.original.underlyingAsset}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: () => 'Vault Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'tvl',
      header: () => (
        <SortableHeader column="tvl" label="TVL" currentSort={currentSort} align="right" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">{formatCurrency(row.original.tvl)}</div>
      ),
    },
    {
      accessorKey: 'depositorCount',
      header: () => (
        <SortableHeader column="depositors" label="Depositors" currentSort={currentSort} align="right" />
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.original.depositorCount.toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'netFlow7d',
      header: () => <div className="text-right">Net Flow (7d)</div>,
      cell: ({ row }) => {
        const flow = row.original.netFlow7d;
        const isPositive = flow >= 0;
        return (
          <div className={`text-right ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(flow))}
          </div>
        );
      },
    },
    {
      accessorKey: 'creationDate',
      header: () => (
        <SortableHeader column="age" label="Created" currentSort={currentSort} align="right" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(row.original.creationDate)}
        </div>
      ),
    },
  ];
}
```

#### 2. Create New Vault Data Table Component
**File**: `packages/web/src/vault-directory/components/vault-data-table.tsx` (new file)
**Changes**: Create TanStack Table wrapper

```tsx
'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createColumns } from './vault-columns';
import type { VaultData } from '@/vault-directory/fetch-vaults';
import Link from 'next/link';

interface Props {
  vaults: VaultData[];
  currentSort: string;
}

export function VaultDataTable({ vaults, currentSort }: Props) {
  const columns = createColumns(currentSort);

  const table = useReactTable({
    data: vaults,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell colSpan={columns.length} className="p-0">
                  <Link
                    href={`/vaults/${row.original.chainId}/${row.original.address}`}
                    className="flex"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className="p-2 flex-1"
                        style={{ minWidth: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No vaults found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Note**: The row-as-link pattern above may need refinement. Alternative approach - wrap each cell content in a link or use a click handler that navigates. Let me revise:

```tsx
'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createColumns } from './vault-columns';
import type { VaultData } from '@/vault-directory/fetch-vaults';
import Link from 'next/link';

interface Props {
  vaults: VaultData[];
  currentSort: string;
}

export function VaultDataTable({ vaults, currentSort }: Props) {
  const columns = createColumns(currentSort);

  const table = useReactTable({
    data: vaults,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const vault = row.original;
              const href = `/vaults/${vault.chainId}/${vault.address}`;

              return (
                <TableRow
                  key={row.id}
                  className="group relative"
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell key={cell.id} className="relative">
                      {index === 0 && (
                        <Link
                          href={href}
                          className="absolute inset-0"
                          aria-label={`View ${vault.name} vault details`}
                        />
                      )}
                      <span className="relative pointer-events-none">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No vaults found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npm run build`
- [ ] No linting errors: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] Table renders with all columns
- [ ] Clicking TVL/Depositors/Created headers changes URL sort param
- [ ] Active sort column shows filled arrow icon
- [ ] Table rows are clickable and navigate to vault details
- [ ] Rows are actual `<a>` tags (right-click shows "Open in new tab")

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 4: Create Discrete Filter Popover

### Overview
Replace the large filter Card with a compact filter button that opens a popover.

### Changes Required:

#### 1. Create Filter Popover Component
**File**: `packages/web/src/vault-directory/components/vault-filter-popover.tsx` (new file)
**Changes**: Create popover with all filter controls

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TVLRangeFilter } from './filters/tvl-range-filter';
import { DepositorCountFilter } from './filters/depositor-count-filter';
import { NetFlowFilter } from './filters/net-flow-filter';
import { UnderlyingAssetFilter } from './filters/underlying-asset-filter';
import { ChainFilter } from './filters/chain-filter';
import { ProtocolFilter } from './filters/protocol-filter';

interface Props {
  metadata: {
    ranges: {
      tvl: { max: number };
      depositors: { max: number };
    };
    assets: { symbol: string }[];
    chains: number[];
    protocols: string[];
  };
  activeFilterCount: number;
}

export function VaultFilterPopover({ metadata, activeFilterCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Parse current filter values from URL
  const tvlMin = searchParams.get('tvl_min');
  const tvlMax = searchParams.get('tvl_max');
  const depositorsMin = searchParams.get('depositors_min');
  const depositorsMax = searchParams.get('depositors_max');
  const netFlow = searchParams.get('net_flow') || 'all';
  const assets = searchParams.get('underlying_assets')?.split(',').filter(Boolean) || [];
  const chains = searchParams.get('chains')?.split(',').filter(Boolean).map(Number) || [];
  const protocols = searchParams.get('protocols')?.split(',').filter(Boolean) || [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    params.delete('page');

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      const sort = searchParams.get('sort');
      if (sort) params.set('sort', sort);
      router.push(`?${params.toString()}`);
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                disabled={isPending}
              >
                Clear all
              </Button>
            )}
          </div>

          <Separator />

          {/* TVL Range */}
          <div className="space-y-2">
            <Label className="text-sm">TVL Range (USD)</Label>
            <TVLRangeFilter
              value={tvlMin && tvlMax ? { min: Number(tvlMin), max: Number(tvlMax) } : null}
              onChange={(range) => updateFilters({
                tvl_min: range?.min?.toString() || null,
                tvl_max: range?.max?.toString() || null,
              })}
              max={metadata.ranges.tvl.max}
            />
          </div>

          {/* Depositor Count */}
          <div className="space-y-2">
            <Label className="text-sm">Depositor Count</Label>
            <DepositorCountFilter
              value={depositorsMin && depositorsMax ? { min: Number(depositorsMin), max: Number(depositorsMax) } : null}
              onChange={(range) => updateFilters({
                depositors_min: range?.min?.toString() || null,
                depositors_max: range?.max?.toString() || null,
              })}
              max={metadata.ranges.depositors.max}
            />
          </div>

          {/* Net Flow */}
          <div className="space-y-2">
            <Label className="text-sm">Net Flow (7d)</Label>
            <NetFlowFilter
              value={netFlow as 'all' | 'positive' | 'negative'}
              onChange={(option) => updateFilters({ net_flow: option })}
            />
          </div>

          {/* Underlying Assets */}
          <div className="space-y-2">
            <Label className="text-sm">Underlying Assets</Label>
            <UnderlyingAssetFilter
              value={assets}
              onChange={(selected) => updateFilters({
                underlying_assets: selected.length > 0 ? selected.join(',') : null,
              })}
              options={metadata.assets.map((a) => a.symbol)}
            />
          </div>

          {/* Chains */}
          <div className="space-y-2">
            <Label className="text-sm">Chains</Label>
            <ChainFilter
              value={chains}
              onChange={(selected) => updateFilters({
                chains: selected.length > 0 ? selected.join(',') : null,
              })}
              options={metadata.chains}
            />
          </div>

          {/* Protocols */}
          <div className="space-y-2">
            <Label className="text-sm">Protocols</Label>
            <ProtocolFilter
              value={protocols}
              onChange={(selected) => updateFilters({
                protocols: selected.length > 0 ? selected.join(',') : null,
              })}
              options={metadata.protocols}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

#### 2. Create Vault Directory Content Component
**File**: `packages/web/src/vault-directory/vault-directory-content.tsx` (new file)
**Changes**: Main content component with toolbar, filters, table, and pagination

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { VaultDataTable } from './components/vault-data-table';
import { VaultFilterPopover } from './components/vault-filter-popover';
import { VaultDirectoryPagination } from './components/vault-directory-pagination';
import { SortControls } from './components/sort-controls';
import { Spinner } from '@/components/ui/spinner';
import type { VaultData } from './fetch-vaults';

interface Props {
  vaults: VaultData[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  metadata: any;
  searchParams: Record<string, string | undefined>;
}

export function VaultDirectoryContent({ vaults, pagination, metadata, searchParams }: Props) {
  const currentSort = searchParams.sort || 'tvl';
  const currentPage = Number(searchParams.page) || 1;

  // Count active filters
  const activeFilterCount = [
    searchParams.tvl_min || searchParams.tvl_max,
    searchParams.depositors_min || searchParams.depositors_max,
    searchParams.net_flow && searchParams.net_flow !== 'all',
    searchParams.underlying_assets,
    searchParams.chains,
    searchParams.protocols,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <VaultFilterPopover
            metadata={metadata}
            activeFilterCount={activeFilterCount}
          />
          <span className="text-sm text-muted-foreground">
            {pagination.totalCount.toLocaleString()} {pagination.totalCount === 1 ? 'vault' : 'vaults'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <SortControls value={currentSort} />
        </div>
      </div>

      {/* Table */}
      <VaultDataTable vaults={vaults} currentSort={currentSort} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <VaultDirectoryPagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}
```

#### 3. Update Sort Controls to Use Links
**File**: `packages/web/src/vault-directory/components/sort-controls.tsx`
**Changes**: Convert to use URL navigation

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useTransition } from 'next/navigation';

interface Props {
  value: string;
}

export function SortControls({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sortOptions = [
    { value: 'tvl', label: 'Total Value Locked' },
    { value: 'depositors', label: 'Depositor Count' },
    { value: 'age', label: 'Age (Newest First)' },
  ];

  const handleChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.delete('page'); // Reset to page 1

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### 4. Update Pagination to Use Links
**File**: `packages/web/src/vault-directory/components/vault-directory-pagination.tsx`
**Changes**: Convert to use URL-based navigation with Links

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Props {
  currentPage: number;
  totalPages: number;
}

export function VaultDirectoryPagination({ currentPage, totalPages }: Props) {
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    return `?${params.toString()}`;
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={createPageUrl(currentPage - 1)}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {generatePageNumbers().map((page, index) => (
          <PaginationItem key={index}>
            {page === '...' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={createPageUrl(page as number)}
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={createPageUrl(currentPage + 1)}
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npm run build`
- [ ] No linting errors: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] Filter button shows in toolbar
- [ ] Clicking filter button opens popover with all 6 filters
- [ ] Active filter count badge shows when filters are applied
- [ ] Changing a filter updates URL and refreshes data
- [ ] "Clear all" button removes all filters
- [ ] Pagination links work correctly
- [ ] Sort dropdown updates URL and data

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 5: Mobile Optimization and Cleanup

### Overview
Ensure table scrolls horizontally on mobile and remove deprecated files.

### Changes Required:

#### 1. Ensure Table Container Has Overflow
**File**: `packages/web/src/vault-directory/components/vault-data-table.tsx`
**Verify**: The container already has `overflow-x-auto` class

#### 2. Update Table Styles for Mobile
**File**: `packages/web/src/vault-directory/components/vault-data-table.tsx`
**Changes**: Add minimum widths to prevent column squishing

```tsx
// In the Table wrapper div
<div className="rounded-md border overflow-x-auto">
  <Table className="min-w-[800px]">
    {/* ... */}
  </Table>
</div>
```

#### 3. Remove Deprecated Files
Delete the following files that are no longer needed:
- `packages/web/src/app/vaults/vault-directory-page.tsx`
- `packages/web/src/vault-directory/vault-directory.tsx`
- `packages/web/src/vault-directory/vault-directory.context.tsx`
- `packages/web/src/vault-directory/hooks/use-vault-directory.ts`
- `packages/web/src/vault-directory/queries/use-vaults-query.ts`
- `packages/web/src/vault-directory/queries/use-vaults-metadata-query.ts`
- `packages/web/src/vault-directory/queries/use-assets-query.ts`
- `packages/web/src/vault-directory/components/vault-filters.tsx`
- `packages/web/src/vault-directory/components/vault-grid.tsx`
- `packages/web/src/vault-directory/components/vault-table-header.tsx`
- `packages/web/src/vault-directory/components/vault-table-row.tsx`
- `packages/web/src/vault-directory/components/vault-toolbar.tsx`

#### 4. Update Any Remaining Imports
Check for and update any files that may import from deleted modules.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npm run build`
- [ ] No linting errors: `cd packages/web && npm run lint`
- [ ] No unused imports or dead code warnings

#### Manual Verification:
- [ ] On mobile viewport (375px), table scrolls horizontally
- [ ] All columns remain visible when scrolling
- [ ] Touch scrolling works smoothly
- [ ] Filter popover works on mobile
- [ ] No console errors

**Implementation Note**: After completing this phase and all automated verification passes, pause here for final manual confirmation.

---

## Testing Strategy

### Unit Tests
- Test `fetchVaults` function with various search params
- Test `createColumns` returns correct column definitions
- Test pagination URL generation

### Integration Tests
- Test page renders with server-side data
- Test filter changes update URL and refetch data
- Test sort changes work correctly
- Test pagination navigation

### Manual Testing Steps
1. Load /vaults page - verify data loads server-side
2. Click column headers to sort - verify URL updates
3. Open filter popover - verify all filters present
4. Apply filters - verify data updates and URL changes
5. Clear filters - verify all filters reset
6. Navigate pages - verify pagination works
7. Click vault row - verify navigation to detail page
8. Test on mobile viewport - verify horizontal scroll
9. Verify branding shows "Fusion" everywhere

## Performance Considerations

- Server-side data fetching eliminates loading states
- Next.js caching (revalidate: 60) reduces API calls
- No client-side React Query overhead
- Smaller JavaScript bundle (no React Query for vaults)

## Migration Notes

- URL parameter format remains the same for backwards compatibility
- localStorage persistence is removed (users may lose saved filters)
- React Query removed for vault data but may still be used elsewhere

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0008.md`
- shadcn data-table example: Used for TanStack Table patterns
- Current implementation: `packages/web/src/vault-directory/`
