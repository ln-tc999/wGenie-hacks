# Vault List Filtering and Sorting Implementation Plan

## Overview

Implement server-side filtering, sorting, and pagination for the vault list, along with dynamic filter ranges and new filter options (chain, protocol). The frontend filter UI already exists but the backend ignores all filter parameters.

## Current State Analysis

### What Works
- Filter UI components exist: TVL range, depositor count, net flow, underlying assets
- Sort controls exist: TVL, depositors, age
- State management with URL params + localStorage persistence
- Data fetching from RPC and DB sources

### What's Missing
- **Backend filtering**: `packages/ponder/src/api/vaults/vaults-list.ts` ignores all query params
- **Backend sorting**: Returns vaults in fixed order from `plasma-vaults.json`
- **Backend pagination**: Returns all 54 vaults with hardcoded `totalPages: 1`
- **Dynamic ranges**: TVL max hardcoded at $1B, depositor ranges are fixed buckets
- **Chain filter**: No UI or backend support
- **Protocol filter**: No UI or backend support
- **Assets API**: Hardcoded 3 assets instead of derived from vault data

### Key Discoveries
- 54 vaults across 6 chains: Ethereum (1), Arbitrum (42161), Base (8453), Avalanche (43114), Unichain (130), Sonic (9745)
- All vaults currently have protocol "wGenie Fusion" but structure supports future protocols
- Underlying assets vary widely across vaults

## Desired End State

After implementation:
1. All filter parameters are processed server-side with proper pagination
2. TVL and depositor filters use logarithmic scale sliders
3. Chain and protocol filters are available
4. Filter metadata (max values, available options) is fetched from API
5. Assets list is dynamically derived from vault data

### Verification
- Filtering by any parameter returns correct subset of vaults
- Sorting works in expected order (descending for TVL/depositors, newest first for age)
- Pagination correctly splits results
- Logarithmic sliders provide good UX across large value ranges
- URL params correctly persist and restore filter state

## What We're NOT Doing

- Search by vault name (text search) - not in ticket scope
- Multi-sort (sort by multiple fields)
- Saved filter presets
- Export/download functionality
- Advanced filter logic (AND/OR combinations)

## Implementation Approach

We'll implement in 4 phases:
1. Backend filtering, sorting, and pagination
2. Backend metadata endpoint for dynamic ranges
3. Frontend logarithmic scale filters
4. Frontend chain and protocol filters

---

## Phase 1: Backend Filtering, Sorting, and Pagination

### Overview
Implement query parameter handling in the vaults-list API endpoint to filter, sort, and paginate results.

### Changes Required

#### 1. Update vaults-list API
**File**: `packages/ponder/src/api/vaults/vaults-list.ts`

**Changes**: Parse query parameters and apply filtering, sorting, and pagination to the enriched vaults array.

```typescript
import { Hono } from 'hono';
import { formatUnits } from 'viem';
import { z } from 'zod';
import { ERC4626_VAULTS } from '../../contracts';
import { fetchAllVaultsRpcData } from './vault-rpc-data';
import { fetchAllVaultsDbData } from './vault-db-data';
import { getCacheKey } from '../../utils/cache';
import { ChainId } from '../../utils/chains';

// Query parameter schema
const vaultsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['tvl', 'depositors', 'age']).default('tvl'),
  tvl_min: z.coerce.number().optional(),
  tvl_max: z.coerce.number().optional(),
  depositors_min: z.coerce.number().int().optional(),
  depositors_max: z.coerce.number().int().optional(),
  net_flow: z.enum(['positive', 'negative']).optional(),
  underlying_assets: z.string().optional(), // Comma-separated symbols
  chains: z.string().optional(), // Comma-separated chain IDs
  protocols: z.string().optional(), // Comma-separated protocol names
});

export const vaultsList = new Hono();

vaultsList.get('/', async (c) => {
  // Parse and validate query parameters
  const queryResult = vaultsQuerySchema.safeParse(Object.fromEntries(c.req.query()));
  if (!queryResult.success) {
    return c.json({ error: 'Invalid query parameters', details: queryResult.error.flatten() }, 400);
  }
  const query = queryResult.data;

  const vaults = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId as ChainId,
    address: v.address,
  }));

  // Fetch data in parallel from RPC and DB
  const [rpcDataMap, dbDataMap] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllVaultsDbData(vaults),
  ]);

  // Combine all data sources into enriched vaults
  let enrichedVaults = ERC4626_VAULTS.map((vault) => {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const dbKey = `${vault.chainId}:${vault.address.toLowerCase()}`;

    const rpcData = rpcDataMap.get(rpcKey);
    const dbData = dbDataMap.get(dbKey);

    const tvl =
      rpcData && rpcData.assetDecimals
        ? Number(formatUnits(rpcData.totalAssets, rpcData.assetDecimals))
        : 0;

    let netFlow7d = 0;
    if (dbData && rpcData && rpcData.assetDecimals && dbData.netFlow7d !== null) {
      const formatted = Number(formatUnits(dbData.netFlow7d, rpcData.assetDecimals));
      netFlow7d = Number.isNaN(formatted) ? 0 : formatted;
    }

    const creationDate = dbData?.firstDepositTimestamp
      ? new Date(dbData.firstDepositTimestamp * 1000).toISOString().split('T')[0]
      : '1970-01-01';

    return {
      chainId: vault.chainId,
      address: vault.address,
      name: vault.name,
      protocol: vault.protocol,
      tvl,
      underlyingAsset: rpcData?.assetSymbol ?? 'UNKNOWN',
      underlyingAssetAddress: rpcData?.assetAddress ?? '0x0000000000000000000000000000000000000000',
      depositorCount: dbData?.depositorCount ?? 0,
      netFlow7d,
      creationDate,
      sharePrice: rpcData?.sharePrice ?? 0,
    };
  });

  // Apply filters
  if (query.tvl_min !== undefined) {
    enrichedVaults = enrichedVaults.filter((v) => v.tvl >= query.tvl_min!);
  }
  if (query.tvl_max !== undefined) {
    enrichedVaults = enrichedVaults.filter((v) => v.tvl <= query.tvl_max!);
  }
  if (query.depositors_min !== undefined) {
    enrichedVaults = enrichedVaults.filter((v) => v.depositorCount >= query.depositors_min!);
  }
  if (query.depositors_max !== undefined) {
    enrichedVaults = enrichedVaults.filter((v) => v.depositorCount <= query.depositors_max!);
  }
  if (query.net_flow === 'positive') {
    enrichedVaults = enrichedVaults.filter((v) => v.netFlow7d > 0);
  } else if (query.net_flow === 'negative') {
    enrichedVaults = enrichedVaults.filter((v) => v.netFlow7d < 0);
  }
  if (query.underlying_assets) {
    const assets = query.underlying_assets.split(',').map((a) => a.trim().toUpperCase());
    enrichedVaults = enrichedVaults.filter((v) => assets.includes(v.underlyingAsset.toUpperCase()));
  }
  if (query.chains) {
    const chainIds = query.chains.split(',').map((c) => parseInt(c.trim(), 10));
    enrichedVaults = enrichedVaults.filter((v) => chainIds.includes(v.chainId));
  }
  if (query.protocols) {
    const protocols = query.protocols.split(',').map((p) => p.trim().toLowerCase());
    enrichedVaults = enrichedVaults.filter((v) => protocols.includes(v.protocol.toLowerCase()));
  }

  // Apply sorting
  enrichedVaults.sort((a, b) => {
    switch (query.sort) {
      case 'tvl':
        return b.tvl - a.tvl; // Descending
      case 'depositors':
        return b.depositorCount - a.depositorCount; // Descending
      case 'age':
        // Newest first (most recent creation date)
        return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
      default:
        return 0;
    }
  });

  // Apply pagination
  const totalCount = enrichedVaults.length;
  const totalPages = Math.ceil(totalCount / query.limit);
  const startIndex = (query.page - 1) * query.limit;
  const paginatedVaults = enrichedVaults.slice(startIndex, startIndex + query.limit);

  return c.json({
    vaults: paginatedVaults,
    pagination: {
      currentPage: query.page,
      totalPages,
      totalCount,
      hasNext: query.page < totalPages,
      hasPrevious: query.page > 1,
    },
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd packages/ponder && npx tsc --noEmit`
- [ ] Ponder starts successfully: `cd packages/ponder && pnpm dev` (check for startup errors)
- [ ] API responds to basic request: `curl "http://localhost:42069/api/vaults"`
- [ ] Filtering works: `curl "http://localhost:42069/api/vaults?tvl_min=100000"` returns filtered results
- [ ] Sorting works: `curl "http://localhost:42069/api/vaults?sort=depositors"` returns sorted results
- [ ] Pagination works: `curl "http://localhost:42069/api/vaults?page=2&limit=10"` returns correct page

#### Manual Verification:
- [ ] Visit http://localhost:3000/vaults and verify filters affect the displayed vaults
- [ ] Verify pagination updates correctly when filters reduce result count
- [ ] Verify sort order matches selected option

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Backend Metadata Endpoint

### Overview
Create a new endpoint to provide filter metadata: max TVL, max depositors, available chains, available protocols, and available underlying assets. This data will be used by the frontend for dynamic filter ranges.

### Changes Required

#### 1. Create metadata endpoint
**File**: `packages/ponder/src/api/vaults/vaults-metadata.ts` (new file)

```typescript
import { Hono } from 'hono';
import { formatUnits } from 'viem';
import { ERC4626_VAULTS } from '../../contracts';
import { fetchAllVaultsRpcData } from './vault-rpc-data';
import { fetchAllVaultsDbData } from './vault-db-data';
import { getCacheKey } from '../../utils/cache';
import { ChainId } from '../../utils/chains';

// Chain name mapping
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  43114: 'Avalanche',
  130: 'Unichain',
  9745: 'Sonic',
};

export const vaultsMetadata = new Hono();

vaultsMetadata.get('/', async (c) => {
  const vaults = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId as ChainId,
    address: v.address,
  }));

  // Fetch data in parallel
  const [rpcDataMap, dbDataMap] = await Promise.all([
    fetchAllVaultsRpcData(vaults),
    fetchAllVaultsDbData(vaults),
  ]);

  // Compute aggregated metadata
  let maxTvl = 0;
  let maxDepositors = 0;
  const chainsSet = new Set<number>();
  const protocolsSet = new Set<string>();
  const assetsMap = new Map<string, { symbol: string; chainId: number; address: string }>();

  for (const vault of ERC4626_VAULTS) {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const dbKey = `${vault.chainId}:${vault.address.toLowerCase()}`;

    const rpcData = rpcDataMap.get(rpcKey);
    const dbData = dbDataMap.get(dbKey);

    // TVL
    const tvl =
      rpcData && rpcData.assetDecimals
        ? Number(formatUnits(rpcData.totalAssets, rpcData.assetDecimals))
        : 0;
    if (tvl > maxTvl) maxTvl = tvl;

    // Depositors
    const depositorCount = dbData?.depositorCount ?? 0;
    if (depositorCount > maxDepositors) maxDepositors = depositorCount;

    // Chains
    chainsSet.add(vault.chainId);

    // Protocols
    protocolsSet.add(vault.protocol);

    // Assets (dedupe by symbol, prefer lower chainId for address)
    if (rpcData?.assetSymbol && rpcData.assetSymbol !== 'UNKNOWN') {
      const existing = assetsMap.get(rpcData.assetSymbol);
      if (!existing || vault.chainId < existing.chainId) {
        assetsMap.set(rpcData.assetSymbol, {
          symbol: rpcData.assetSymbol,
          chainId: vault.chainId,
          address: rpcData.assetAddress,
        });
      }
    }
  }

  // Build chains array with names
  const chains = Array.from(chainsSet)
    .sort((a, b) => a - b)
    .map((chainId) => ({
      chainId,
      name: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    }));

  // Build protocols array
  const protocols = Array.from(protocolsSet).sort();

  // Build assets array
  const assets = Array.from(assetsMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return c.json({
    ranges: {
      tvl: { min: 0, max: Math.ceil(maxTvl) },
      depositors: { min: 0, max: maxDepositors },
    },
    chains,
    protocols,
    assets,
    totalVaults: ERC4626_VAULTS.length,
  });
});
```

#### 2. Register metadata endpoint
**File**: `packages/ponder/src/api/vaults/index.ts`

**Changes**: Add the metadata endpoint to the vaults router.

```typescript
import { Hono } from 'hono';
import { vaultsList } from './vaults-list';
import { vaultsMetadata } from './vaults-metadata';
import { vault } from './vault';
import { metrics } from './metrics';
import { depositors } from './depositors';
import { flowChart } from './flow-chart';

export const vaults = new Hono().basePath('/vaults');

// List and metadata endpoints
vaults.route('/', vaultsList);
vaults.route('/metadata', vaultsMetadata);

// Individual vault endpoints
vaults.route('/:chainId/:vaultAddress', vault);
vaults.route('/:chainId/:vaultAddress/metrics', metrics);
vaults.route('/:chainId/:vaultAddress/depositors', depositors);
vaults.route('/:chainId/:vaultAddress/flow-chart', flowChart);
```

#### 3. Create frontend query for metadata
**File**: `packages/web/src/vault-directory/queries/use-vaults-metadata-query.ts` (new file)

```typescript
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { addressSchema } from '@/lib/schema';

const chainSchema = z.object({
  chainId: z.number(),
  name: z.string(),
});

const assetSchema = z.object({
  symbol: z.string(),
  chainId: z.number(),
  address: addressSchema,
});

const vaultsMetadataSchema = z.object({
  ranges: z.object({
    tvl: z.object({ min: z.number(), max: z.number() }),
    depositors: z.object({ min: z.number(), max: z.number() }),
  }),
  chains: z.array(chainSchema),
  protocols: z.array(z.string()),
  assets: z.array(assetSchema),
  totalVaults: z.number(),
});

export type VaultsMetadata = z.infer<typeof vaultsMetadataSchema>;

const fetchVaultsMetadata = async () => {
  const response = await apiClient.get('/api/vaults/metadata');
  return vaultsMetadataSchema.parse(response.data);
};

export const useVaultsMetadataQuery = () => {
  return useQuery({
    queryKey: ['vaultsMetadata'],
    queryFn: fetchVaultsMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### 4. Update use-vault-directory hook to use metadata
**File**: `packages/web/src/vault-directory/hooks/use-vault-directory.ts`

**Changes**: Add metadata query and expose it in the return value.

Add import at top:
```typescript
import { useVaultsMetadataQuery } from '@/vault-directory/queries/use-vaults-metadata-query';
```

Add after `useAssetsQuery`:
```typescript
const { data: metadata, isLoading: isMetadataLoading } = useVaultsMetadataQuery();
```

Update return statement to include:
```typescript
return {
  // ... existing fields ...
  metadata,
  isMetadataLoading,
};
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/ponder && npx tsc --noEmit`
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Metadata endpoint responds: `curl "http://localhost:42069/api/vaults/metadata"`
- [ ] Response includes all expected fields (ranges, chains, protocols, assets)

#### Manual Verification:
- [ ] Metadata endpoint returns sensible max TVL value (check against actual vault data)
- [ ] All 6 chains are returned with correct names
- [ ] Assets list includes variety of underlying assets from vaults

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Frontend Logarithmic Scale Filters

### Overview
Update TVL and depositor filters to use logarithmic scale sliders, using dynamic max values from the metadata API.

### Changes Required

#### 1. Update vault-directory.utils.ts with logarithmic conversion functions
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

**Changes**: Add logarithmic scale conversion utilities.

Add after existing constants:
```typescript
// Logarithmic scale utilities
// Converts a value to a slider position (0-100) using log scale
export const valueToLogSlider = (value: number, min: number, max: number): number => {
  if (value <= min) return 0;
  if (value >= max) return 100;

  // Use log10 for the conversion
  // Add 1 to avoid log(0) issues
  const minLog = Math.log10(min + 1);
  const maxLog = Math.log10(max + 1);
  const valueLog = Math.log10(value + 1);

  return ((valueLog - minLog) / (maxLog - minLog)) * 100;
};

// Converts a slider position (0-100) back to a value using log scale
export const logSliderToValue = (slider: number, min: number, max: number): number => {
  if (slider <= 0) return min;
  if (slider >= 100) return max;

  const minLog = Math.log10(min + 1);
  const maxLog = Math.log10(max + 1);

  const valueLog = minLog + (slider / 100) * (maxLog - minLog);
  return Math.pow(10, valueLog) - 1;
};

// Format large numbers for display (e.g., 1.5M, 250K)
export const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export const formatCompactCount = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};
```

#### 2. Update TVL Range Filter with logarithmic scale
**File**: `packages/web/src/vault-directory/components/filters/tvl-range-filter.tsx`

**Changes**: Replace linear conversion with logarithmic.

```typescript
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { TVLRange } from '@/vault-directory/vault-directory.types';
import {
  MIN_TVL_VALUE,
  validateTVLRange,
  valueToLogSlider,
  logSliderToValue,
  formatCompactNumber,
} from '@/vault-directory/vault-directory.utils';

interface Props {
  value: TVLRange | null;
  onChange: (range: TVLRange | null) => void;
  min?: number;
  max: number; // Now required, from metadata
}

export const TVLRangeFilter = ({
  value,
  onChange,
  min = MIN_TVL_VALUE,
  max,
}: Props) => {
  // Convert current TVL range to slider values (logarithmic)
  const sliderValue = useMemo(() => {
    if (!value) return [0, 100];
    return [
      Math.max(0, valueToLogSlider(value.min, min, max)),
      Math.min(100, valueToLogSlider(value.max, min, max)),
    ];
  }, [value, min, max]);

  const handleSliderChange = (newValues: number[]) => {
    const [sliderMin, sliderMax] = newValues;

    // Convert slider values back to TVL values (logarithmic)
    const tvlMin = logSliderToValue(sliderMin, min, max);
    const tvlMax = logSliderToValue(sliderMax, min, max);

    // Ensure min doesn't exceed max
    const finalMin = Math.min(tvlMin, tvlMax);
    const finalMax = Math.max(tvlMin, tvlMax);

    const range = { min: finalMin, max: finalMax };

    if (validateTVLRange(range, max)) {
      onChange(range);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const getDisplayText = (): string => {
    const minValue = value ? value.min : min;
    const maxValue = value ? value.max : max;
    if (minValue === min && maxValue === max) {
      return 'All TVL ranges';
    }
    return `${formatCompactNumber(minValue)} - ${formatCompactNumber(maxValue)}`;
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground gap-2">
        <span>{formatCompactNumber(min)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <span>{formatCompactNumber(max)}</span>
      </div>

      <div className="text-sm text-center text-foreground bg-muted px-3 py-2 rounded-md">
        {getDisplayText()}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Logarithmic scale for better precision
      </p>
    </div>
  );
};
```

#### 3. Update Depositor Count Filter to use logarithmic slider
**File**: `packages/web/src/vault-directory/components/filters/depositor-count-filter.tsx`

**Changes**: Replace predefined buckets with logarithmic slider.

```typescript
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { DepositorRange } from '@/vault-directory/vault-directory.types';
import {
  valueToLogSlider,
  logSliderToValue,
  formatCompactCount,
} from '@/vault-directory/vault-directory.utils';

interface Props {
  value: DepositorRange | null;
  onChange: (range: DepositorRange | null) => void;
  max: number; // From metadata
}

export const DepositorCountFilter = ({ value, onChange, max }: Props) => {
  const min = 0;

  // Convert current range to slider values (logarithmic)
  const sliderValue = useMemo(() => {
    if (!value) return [0, 100];
    return [
      Math.max(0, valueToLogSlider(value.min, min, max)),
      Math.min(100, valueToLogSlider(value.max, min, max)),
    ];
  }, [value, min, max]);

  const handleSliderChange = (newValues: number[]) => {
    const [sliderMin, sliderMax] = newValues;

    const depMin = Math.round(logSliderToValue(sliderMin, min, max));
    const depMax = Math.round(logSliderToValue(sliderMax, min, max));

    const finalMin = Math.min(depMin, depMax);
    const finalMax = Math.max(depMin, depMax);

    // Generate label for URL persistence
    const label = `${finalMin}-${finalMax === max ? 'max' : finalMax}`;

    onChange({ min: finalMin, max: finalMax, label });
  };

  const handleClear = () => {
    onChange(null);
  };

  const getDisplayText = (): string => {
    if (!value) return 'All depositor counts';
    const minText = formatCompactCount(value.min);
    const maxText = value.max >= max ? `${formatCompactCount(max)}+` : formatCompactCount(value.max);
    return `${minText} - ${maxText} depositors`;
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground gap-2">
        <span>{formatCompactCount(min)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <span>{formatCompactCount(max)}</span>
      </div>

      <div className="text-sm text-center text-foreground bg-muted px-3 py-2 rounded-md">
        {getDisplayText()}
      </div>
    </div>
  );
};
```

#### 4. Update VaultFilters to pass metadata to filter components
**File**: `packages/web/src/vault-directory/components/vault-filters.tsx`

**Changes**: Pass max values from metadata to filter components.

Update the component to receive and use metadata:
```typescript
export const VaultFilters = () => {
  const { filters, metadata, isFiltersActive, filterActions } =
    useVaultDirectoryContext();

  // Default max values if metadata not loaded
  const maxTvl = metadata?.ranges.tvl.max ?? 1_000_000_000;
  const maxDepositors = metadata?.ranges.depositors.max ?? 10_000;
  const availableAssets = metadata?.assets.map((a) => a.symbol) ?? [];

  // ... rest of component

  return (
    <Card>
      {/* ... */}
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* TVL Range Filter */}
          <div className="space-y-6">
            <Label>TVL Range (USD)</Label>
            <TVLRangeFilter
              value={filters.tvlRange}
              onChange={(range) => filterActions.updateTVLRange(range)}
              max={maxTvl}
            />
          </div>

          {/* Depositor Count Filter */}
          <div className="space-y-2">
            <Label>Depositor Count</Label>
            <DepositorCountFilter
              value={filters.depositorRange}
              onChange={(range) => filterActions.updateDepositorRange(range)}
              max={maxDepositors}
            />
          </div>

          {/* ... other filters */}

          {/* Underlying Assets Filter */}
          <div className="space-y-2">
            <Label>Underlying Assets</Label>
            <UnderlyingAssetFilter
              value={filters.underlyingAssets}
              onChange={(assets) => filterActions.updateUnderlyingAssets(assets)}
              options={availableAssets}
            />
          </div>
        </div>
      </CardContent>
      {/* ... */}
    </Card>
  );
};
```

#### 5. Update validateTVLRange to accept dynamic max
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

**Changes**: Update validation function signature.

```typescript
export const validateTVLRange = (
  range: { min: number; max: number },
  maxTvl: number = MAX_TVL_VALUE,
): boolean => {
  return (
    range.min >= MIN_TVL_VALUE &&
    range.max <= maxTvl &&
    range.min <= range.max
  );
};
```

#### 6. Update types for DepositorRange
**File**: `packages/web/src/vault-directory/vault-directory.types.ts`

The existing `DepositorRange` type already supports `min`, `max`, and `label` which works with the new slider approach.

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No console errors on page load
- [ ] Slider components render without crashing

#### Manual Verification:
- [ ] TVL slider provides good precision across the full range ($0 to max TVL)
- [ ] Moving slider from 0 to 50% covers roughly $0 to ~$1M (logarithmic behavior)
- [ ] Depositor slider behaves similarly with logarithmic distribution
- [ ] Filter values display correctly in compact format (K, M, B)
- [ ] Filters work correctly with backend when applied

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Frontend Chain and Protocol Filters

### Overview
Add chain and protocol filter components and integrate them into the filter UI.

### Changes Required

#### 1. Update VaultFilters type to include chain and protocol
**File**: `packages/web/src/vault-directory/vault-directory.types.ts`

**Changes**: Add new filter fields.

```typescript
export interface VaultFilters {
  tvlRange: TVLRange | null;
  depositorRange: DepositorRange | null;
  netFlow: NetFlowOption;
  underlyingAssets: string[]; // Symbols of selected underlying assets
  chains: number[]; // Chain IDs
  protocols: string[]; // Protocol names
}
```

#### 2. Update FilterActions type
**File**: `packages/web/src/vault-directory/vault-directory.types.ts`

```typescript
export interface FilterActions {
  updateTVLRange: (range: TVLRange | null) => void;
  updateDepositorRange: (range: DepositorRange | null) => void;
  updateNetFlow: (option: NetFlowOption) => void;
  updateUnderlyingAssets: (assets: string[]) => void;
  updateChains: (chains: number[]) => void;
  updateProtocols: (protocols: string[]) => void;
  clearFilters: () => void;
}
```

#### 3. Update DEFAULT_FILTERS
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

```typescript
export const DEFAULT_FILTERS: VaultFilters = {
  tvlRange: null,
  depositorRange: null,
  netFlow: 'all',
  underlyingAssets: [],
  chains: [],
  protocols: [],
};
```

#### 4. Update URL parameter handling
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

In `updateURLParams`, add:
```typescript
url.searchParams.delete('chains');
url.searchParams.delete('protocols');

// ... existing code ...

if (filters.chains.length > 0) {
  url.searchParams.set('chains', filters.chains.join(','));
}

if (filters.protocols.length > 0) {
  url.searchParams.set('protocols', filters.protocols.join(','));
}
```

In `parseURLParams`, add:
```typescript
const filters: VaultFilters = {
  // ... existing fields ...
  chains: params.get('chains')?.split(',').map(Number).filter(n => !isNaN(n)) || [],
  protocols: params.get('protocols')?.split(',').filter(Boolean) || [],
};
```

#### 5. Update convertFiltersToAPIParams
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

In `VaultAPIParams` interface (in use-vaults-query.ts), add:
```typescript
chains?: string; // Comma-separated chain IDs
protocols?: string; // Comma-separated protocol names
```

In `convertFiltersToAPIParams`, add:
```typescript
if (filters.chains.length > 0) {
  params.chains = filters.chains.join(',');
}

if (filters.protocols.length > 0) {
  params.protocols = filters.protocols.join(',');
}
```

#### 6. Update isFiltersActive
**File**: `packages/web/src/vault-directory/vault-directory.utils.ts`

```typescript
export const isFiltersActive = (filters: VaultFilters): boolean => {
  return (
    filters.tvlRange !== null ||
    filters.depositorRange !== null ||
    filters.netFlow !== 'all' ||
    filters.underlyingAssets.length > 0 ||
    filters.chains.length > 0 ||
    filters.protocols.length > 0
  );
};
```

#### 7. Create Chain Filter Component
**File**: `packages/web/src/vault-directory/components/filters/chain-filter.tsx` (new file)

```typescript
import { MultiSelect } from '@/components/ui/multiselect';

interface ChainOption {
  chainId: number;
  name: string;
}

interface Props {
  value: number[];
  onChange: (chains: number[]) => void;
  options: ChainOption[];
}

export const ChainFilter = ({ value, onChange, options }: Props) => {
  const chainOptions = options.map((chain) => ({
    value: chain.chainId.toString(),
    label: chain.name,
  }));

  const handleChange = (selected: string[]) => {
    onChange(selected.map(Number));
  };

  const getTriggerText = (
    selectedCount: number,
    selectedItems: { value: string; label: string }[],
  ) => {
    if (selectedCount === 0) return 'All chains';
    if (selectedCount === 1) return selectedItems[0].label;
    return `${selectedCount} chains selected`;
  };

  return (
    <MultiSelect
      options={chainOptions}
      value={value.map(String)}
      onChange={handleChange}
      placeholder="All chains"
      searchPlaceholder="Search chains..."
      triggerText={getTriggerText}
    />
  );
};
```

#### 8. Create Protocol Filter Component
**File**: `packages/web/src/vault-directory/components/filters/protocol-filter.tsx` (new file)

```typescript
import { MultiSelect } from '@/components/ui/multiselect';

interface Props {
  value: string[];
  onChange: (protocols: string[]) => void;
  options: string[];
}

export const ProtocolFilter = ({ value, onChange, options }: Props) => {
  const protocolOptions = options.map((protocol) => ({
    value: protocol,
    label: protocol,
  }));

  const getTriggerText = (
    selectedCount: number,
    selectedItems: { value: string; label: string }[],
  ) => {
    if (selectedCount === 0) return 'All protocols';
    if (selectedCount === 1) return selectedItems[0].label;
    return `${selectedCount} protocols selected`;
  };

  return (
    <MultiSelect
      options={protocolOptions}
      value={value}
      onChange={onChange}
      placeholder="All protocols"
      searchPlaceholder="Search protocols..."
      triggerText={getTriggerText}
    />
  );
};
```

#### 9. Update useVaultDirectory hook with new filter actions
**File**: `packages/web/src/vault-directory/hooks/use-vault-directory.ts`

Add new filter actions:
```typescript
updateChains: useCallback((chains: number[]) => {
  setFilters((prev) => ({ ...prev, chains }));
}, []),

updateProtocols: useCallback((protocols: string[]) => {
  setFilters((prev) => ({ ...prev, protocols }));
}, []),
```

#### 10. Update VaultFilters component to include new filters
**File**: `packages/web/src/vault-directory/components/vault-filters.tsx`

Add imports:
```typescript
import { ChainFilter } from '@/vault-directory/components/filters/chain-filter';
import { ProtocolFilter } from '@/vault-directory/components/filters/protocol-filter';
```

Add to the grid (after underlying assets filter):
```typescript
{/* Chain Filter */}
<div className="space-y-2">
  <Label>Chains</Label>
  <ChainFilter
    value={filters.chains}
    onChange={(chains) => filterActions.updateChains(chains)}
    options={metadata?.chains ?? []}
  />
</div>

{/* Protocol Filter */}
<div className="space-y-2">
  <Label>Protocols</Label>
  <ProtocolFilter
    value={filters.protocols}
    onChange={(protocols) => filterActions.updateProtocols(protocols)}
    options={metadata?.protocols ?? []}
  />
</div>
```

Update grid class to accommodate 6 filters:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No console errors on page load
- [ ] All new components render without crashing

#### Manual Verification:
- [ ] Chain filter shows all 6 chains (Ethereum, Arbitrum, Base, Avalanche, Unichain, Sonic)
- [ ] Selecting a chain filters vaults to only that chain
- [ ] Protocol filter shows available protocols
- [ ] Multiple filters can be combined
- [ ] URL parameters correctly persist chain and protocol selections
- [ ] Clear All Filters button resets chain and protocol filters

**Implementation Note**: After completing this phase, all functionality should be complete. Perform comprehensive manual testing across all filter combinations.

---

## Testing Strategy

### Unit Tests
- Logarithmic conversion functions (valueToLogSlider, logSliderToValue)
- URL parameter parsing and serialization with new fields
- Filter validation functions

### Integration Tests
- API endpoint returns correct filtered results
- Pagination math is correct
- Sorting order is correct

### Manual Testing Steps
1. Load /vaults page and verify all filters appear
2. Test TVL slider across full range - verify logarithmic behavior
3. Test depositor slider across full range
4. Filter by single chain, verify only that chain's vaults appear
5. Filter by multiple chains, verify combined results
6. Apply multiple filters simultaneously
7. Verify pagination updates correctly with filters
8. Verify URL parameters update and page can be refreshed
9. Clear all filters and verify reset works
10. Test on mobile viewport - verify responsive layout

## Performance Considerations

1. **Metadata caching**: The metadata endpoint fetches RPC data. Consider caching for 5 minutes server-side to reduce RPC calls.

2. **Parallel data fetching**: Already implemented - RPC and DB data fetched in parallel.

3. **Client-side caching**: React Query already handles this with staleTime configuration.

4. **Pagination**: With 54 vaults, pagination is mainly for future growth. Current implementation handles it efficiently.

## Migration Notes

No data migration needed. This is purely additive functionality.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0004.md`
- Existing vault directory implementation: `packages/web/src/vault-directory/`
- Vaults list API: `packages/ponder/src/api/vaults/vaults-list.ts`
- Vault registry: `plasma-vaults.json`
