# Next.js Reads Directly from Supabase — Implementation Plan

## Overview

Replace the Ponder REST API with direct Supabase access. Transform `@wgenie/fusion-supabase-ponder` by removing Drizzle ORM and adding a type-safe `@supabase/supabase-js` client with auto-generated types. Next.js reads directly from Supabase (server-side only). Client-side React Query hooks switch from Ponder API to Next.js Route Handlers. Mastra existing code stays unchanged (`pg` Client); the shared Supabase client is available for future tools.

## Current State Analysis

### Data Flow (Current)
```
Blockchain → Ponder (indexer) → PostgreSQL (Supabase)
                                     ↓
                              Ponder REST API (Hono)  ← combines DB + RPC data
                                     ↓
                              Next.js (web) fetches via HTTP
```

### Packages Involved
- **`packages/ponder`** — Indexes ERC4626 events, writes to Supabase, exposes REST API at `/api/*`
- **`packages/supabase-ponder`** — Drizzle ORM client for Ponder DB (currently **unused** — zero consumers)
- **`packages/web`** — Next.js 16 app, fetches from Ponder REST API
- **`packages/mastra`** — Uses raw `pg` Client for SQL queries (NOT changing)

### API Endpoints Being Replaced

**Server-side fetches** (use `fetch()` with Next.js caching):
| Endpoint | File | Cache |
|---|---|---|
| `GET /api/vaults` | `web/src/vault-directory/fetch-vaults.ts` | 60s |
| `GET /api/vaults/metadata` | `web/src/vault-directory/fetch-vaults.ts` | 300s |
| `GET /api/activity` | `web/src/activity/fetch-activity.ts` | 30s |
| `GET /api/activity/inflows` | `web/src/activity/fetch-activity.ts` | 60s |
| `GET /api/activity/metadata` | `web/src/activity/fetch-activity.ts` | 300s |

**Client-side fetches** (use `apiClient` Axios):
| Endpoint | File | Purpose |
|---|---|---|
| `GET /api/activity` | `web/src/activity/fetch-activity-client.ts` | Infinite scroll |
| `GET /api/vaults/:chainId/:address/flow-chart` | `web/src/flow-chart/queries/use-flow-chart-query.ts` | Flow chart |
| `GET /api/vaults/:chainId/:address/metrics` | `web/src/vault-metrics/queries/use-vault-metrics-query.ts` | Vault metrics |
| `GET /api/vaults/:chainId/:address/depositors` | `web/src/depositors-list/queries/use-depositors-query.ts` | Depositors list |

### Key Complexity: RPC Enrichment
The Ponder API doesn't just proxy DB data — it **enriches** it with on-chain RPC calls:
- TVL from `totalAssets()` / `totalSupply()`
- Asset symbols and decimals from the underlying ERC20
- Share price calculation
- Amount formatting using proper decimals

This enrichment logic moves to the Next.js server layer.

### Reference Implementation
The `@bajki-creator/app-db` package (`/Users/kuba/code/bajki-creator/packages/app-db/`) demonstrates the target pattern:
- `@supabase/supabase-js` with `createClient<Database>()` for type safety
- Auto-generated types via `supabase gen types typescript --local > src/types.ts`
- Singleton client export consumed by multiple packages
- Environment variable prefixing to avoid conflicts

## Desired End State

```
Blockchain → Ponder (indexer only, no API) → PostgreSQL (Supabase)
                                                  ↓
                                    @wgenie/fusion-supabase-ponder
                                    (shared @supabase/supabase-js client)
                                         ↓              ↓
                                    Next.js          Mastra (future)
                                   (server-side)    (existing pg stays)
                                         ↓
                                Next.js Route Handlers
                                         ↓
                                  Client-side hooks
```

### Verification:
- `pnpm --filter @wgenie/fusion-web build` succeeds
- `pnpm --filter @wgenie/fusion-web dev` — pages load with data
- No `NEXT_PUBLIC_API_URL` env var needed
- No Axios dependency in web package
- Ponder `src/api/` directory deleted (only indexing remains)
- `supabase-ponder` package exports `supabase` client (no Drizzle)

## What We're NOT Doing

- NOT changing Mastra's existing `pg` Client tools/workflows/tests
- NOT changing Ponder's indexing logic (event handlers, schema, buckets)
- NOT adding authentication/RLS (service role key, server-side only)
- NOT creating a new package (extending existing `supabase-ponder`)
- NOT removing GraphQL studio (kept for dev data preview)

## Implementation Approach

We work bottom-up: first transform the shared package, then migrate consumers. Each phase is independently testable.

---

## Phase 1: Transform `supabase-ponder` Package

### Overview
Remove Drizzle ORM, add `@supabase/supabase-js`, generate types from the Ponder DB schema, export a typed singleton client. The package becomes the single source of truth for Supabase access.

### Changes Required:

#### 1. Update package.json

**File**: `packages/supabase-ponder/package.json`
**Changes**: Replace Drizzle dependencies with `@supabase/supabase-js`. Add type generation script.

```json
{
  "name": "@wgenie/fusion-supabase-ponder",
  "version": "0.0.2",
  "private": true,
  "type": "module",
  "description": "Supabase client for Ponder indexed blockchain data",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "test": "tsx src/test-connection.ts",
    "gen:types": "npx supabase gen types typescript --local --project-id fusion-ponder-db > src/types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "dotenv": "^17.2.3",
    "tsx": "^4.20.6",
    "typescript": "^5.8.3"
  }
}
```

Note: Remove `drizzle-orm`, `drizzle-kit`, `postgres`, `zod`. Add `@supabase/supabase-js`.

#### 2. Add `@supabase/supabase-js` to pnpm catalog

**File**: `pnpm-workspace.yaml`
**Changes**: Add supabase-js to catalog for consistent versions.

```yaml
catalog:
  typescript: 5.8.3
  viem: 2.37.9
  zod: 3.24.1
  "@supabase/supabase-js": 2.49.4
```

Then update `packages/supabase-ponder/package.json` to use `"@supabase/supabase-js": "catalog:"`.

#### 3. Create new client

**File**: `packages/supabase-ponder/src/client.ts`
**Changes**: Replace Drizzle client with `@supabase/supabase-js` client.

```typescript
/**
 * Ponder Database Supabase Client
 *
 * Connects to the Ponder Supabase database using @supabase/supabase-js.
 * Uses PONDER_DB_* prefixed environment variables to avoid conflicts with other databases.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.PONDER_DB_SUPABASE_URL;
const supabaseKey = process.env.PONDER_DB_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Ponder Database credentials.\n' +
    'Please set PONDER_DB_SUPABASE_URL and PONDER_DB_SUPABASE_SERVICE_ROLE_KEY environment variables.\n\n' +
    'For local development:\n' +
    '  PONDER_DB_SUPABASE_URL=http://127.0.0.1:54341\n' +
    '  PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>\n\n' +
    'See: packages/supabase-ponder/README.md for setup instructions.'
  );
}

/**
 * Supabase client for the Ponder database
 * Type-safe with auto-generated Database types
 * Uses service role key for server-side access (bypasses RLS)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Get the Ponder database connection details
 * Useful for debugging and logging
 */
export const getPonderDatabaseInfo = () => ({
  url: supabaseUrl,
  project: supabaseUrl?.includes('127.0.0.1')
    ? 'fusion-ponder-db (local)'
    : supabaseUrl?.replace('https://', '').replace('.supabase.co', '') || 'unknown',
});
```

#### 4. Generate types file

**File**: `packages/supabase-ponder/src/types.ts`
**Changes**: Auto-generated by running `pnpm gen:types` with local Supabase running. This will produce a `Database` interface with all Ponder tables (deposit_event, withdrawal_event, depositor, all bucket tables, etc.).

The generated file follows the standard Supabase pattern:
```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      deposit_event: {
        Row: { id: string; chain_id: number; vault_address: string; /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ... all other tables
    }
  }
}
```

**Note**: The exact content is auto-generated. The tables will correspond to what Ponder creates: `deposit_event`, `withdrawal_event`, `transfer_event`, `depositor`, `deposit_buckets_2_hours`, `deposit_buckets_8_hours`, `deposit_buckets_1_day`, `deposit_buckets_4_days`, `withdraw_buckets_2_hours`, `withdraw_buckets_8_hours`, `withdraw_buckets_1_day`, `withdraw_buckets_4_days`, plus any Ponder internal tables (`_ponder_meta`, `_ponder_status`).

#### 5. Update index.ts

**File**: `packages/supabase-ponder/src/index.ts`
**Changes**: Export supabase client and Database type.

```typescript
/**
 * Ponder Database - Supabase Client
 *
 * This package provides the Supabase client for the PONDER database,
 * which stores all blockchain indexed data:
 * - Transfer events
 * - Deposit events
 * - Withdraw events
 * - Vault metrics and aggregations (buckets)
 * - Depositor information
 *
 * This is SEPARATE from other Supabase databases (e.g., Mastra).
 *
 * @example
 * ```ts
 * import { supabase } from '@wgenie/fusion-supabase-ponder';
 *
 * const { data } = await supabase.from('deposit_event').select('*').limit(10);
 * ```
 */

export { supabase, getPonderDatabaseInfo } from './client';
export type { Database } from './types';
```

#### 6. Update .env.example

**File**: `packages/supabase-ponder/.env.example`
**Changes**: Update to use new env var names for supabase-js.

```
# Supabase Ponder Database Client Configuration
# Uses the Supabase REST API (not direct PostgreSQL)

PONDER_DB_SUPABASE_URL=http://127.0.0.1:54341
PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Note: Port 54341 is the Supabase API port (from `config.toml`), not the DB port 54342.

#### 7. Update test-connection.ts

**File**: `packages/supabase-ponder/src/test-connection.ts`
**Changes**: Update to use supabase-js client instead of Drizzle.

```typescript
import 'dotenv/config';
import { supabase, getPonderDatabaseInfo } from './client';

async function testConnection() {
  console.log('Testing Ponder Supabase connection...\n');

  const info = getPonderDatabaseInfo();
  console.log(`Project: ${info.project}`);
  console.log(`URL: ${info.url}\n`);

  // Test key tables
  const tables = [
    'deposit_event',
    'withdrawal_event',
    'transfer_event',
    'depositor',
    'deposit_buckets_2_hours',
    'withdraw_buckets_2_hours',
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${data.length} rows returned`);
    }
  }
}

testConnection().catch(console.error);
```

#### 8. Delete Drizzle files

**Files to delete**:
- `packages/supabase-ponder/src/schema.ts` (Drizzle schema)
- `packages/supabase-ponder/drizzle.config.ts` (Drizzle kit config)
- `packages/supabase-ponder/drizzle/` directory (if exists)

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/supabase-ponder && pnpm install` succeeds
- [ ] `cd packages/supabase-ponder && npx tsc --noEmit` passes
- [ ] No Drizzle imports remain in `packages/supabase-ponder/`

#### Manual Verification:
- [ ] Run `supabase start` in `packages/supabase-ponder/`
- [ ] Run `pnpm gen:types` — generates `src/types.ts` with all Ponder tables
- [ ] Run `pnpm test` — connection test passes, all tables accessible
- [ ] Verify generated types include: `deposit_event`, `withdrawal_event`, `depositor`, all bucket tables

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the `gen:types` output correctly reflects the Ponder schema before proceeding.

---

## Phase 2: Create Next.js Route Handlers

### Overview
Add API route handlers in the Next.js app that query Supabase directly. These replace the client-side Axios calls to the Ponder REST API. Each route handler mirrors a Ponder API endpoint.

### Changes Required:

#### 1. Add `@wgenie/fusion-supabase-ponder` dependency to web

**File**: `packages/web/package.json`
**Changes**: Add workspace dependency.

```json
"dependencies": {
  "@wgenie/fusion-supabase-ponder": "workspace:*",
  // ... existing deps
}
```

#### 2. Route Handler: Activity (for infinite scroll)

**File**: `packages/web/src/app/api/activity/route.ts`
**Changes**: New file. Queries `deposit_event` and `withdrawal_event` tables with cursor-based pagination. Enriches with RPC data for amount formatting.

Logic ported from `packages/ponder/src/api/activity/activity.ts`:
- Parse query params (cursor, limit, chains, vaults, type, min_amount, depositor)
- Query deposit_event and withdrawal_event from Supabase
- Merge, sort by timestamp desc
- Enrich with RPC data (asset decimals, symbols) from `packages/web/src/lib/rpc/` (see Phase 3)
- Return JSON with cursor pagination

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
// ... RPC enrichment imports from web's own lib

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // ... parse params, query supabase, enrich with RPC, return NextResponse.json()
}
```

#### 3. Route Handler: Flow Chart

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/flow-chart/route.ts`
**Changes**: New file. Queries deposit and withdraw bucket tables.

Logic ported from `packages/ponder/src/api/vaults/flow-chart.ts`:
- Parse chainId, address, timeRange params
- Calculate bucket IDs based on period config
- Query deposit_buckets_* and withdraw_buckets_* from Supabase
- Map to chart data format

#### 4. Route Handler: Vault Metrics

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/metrics/route.ts`
**Changes**: New file. Queries depositor and deposit_event tables for aggregate metrics.

Logic ported from `packages/ponder/src/api/vaults/metrics.ts`:
- Query active depositor count and total balance
- Query all-time depositor count
- Query first deposit timestamp

#### 5. Route Handler: Depositors List

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/depositors/route.ts`
**Changes**: New file. Queries depositor table with pagination.

Logic ported from `packages/ponder/src/api/vaults/depositors.ts`:
- Count total depositors with positive balance
- Get paginated depositors sorted by share balance desc

#### 6. Move RPC enrichment logic to web package

**File**: `packages/web/src/lib/rpc/vault-rpc-data.ts`
**Changes**: New file. Port RPC fetching logic from `packages/ponder/src/api/vaults/vault-rpc-data.ts`.

This module provides:
- `fetchVaultRpcData(chainId, address)` — multicall for totalAssets, totalSupply, asset info
- `fetchAllVaultsRpcData(vaults)` — batch fetch grouped by chain
- In-memory caching for RPC results

The web package already has `viem` as a dependency (used by wagmi). We need to set up public clients using server-side RPC URLs (not `NEXT_PUBLIC_*` prefixed).

**File**: `packages/web/src/lib/rpc/clients.ts`
**Changes**: New file. Create viem public clients for each chain using server-side env vars.

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';

const RPC_URLS: Record<number, string | undefined> = {
  1: process.env.RPC_URL_MAINNET,
  42161: process.env.RPC_URL_ARBITRUM,
  8453: process.env.RPC_URL_BASE,
};

export const getPublicClient = (chainId: number) => {
  // ... create and cache public clients
};
```

#### 7. Move shared constants

**File**: `packages/web/src/lib/vaults-registry.ts`
**Changes**: New file. Import and parse `plasma-vaults.json` for vault metadata (name, protocol, chainId).

```typescript
import plasmaVaultsJson from '../../../../plasma-vaults.json';
// ... parse and export ERC4626_VAULTS, getChainVaults, etc.
```

This is needed by Route Handlers to map vault addresses to names/protocols.

#### 8. Move bucket utilities

**File**: `packages/web/src/lib/buckets.ts`
**Changes**: New file. Port bucket calculation logic from `packages/ponder/src/utils/buckets.ts` and `packages/ponder/src/utils/periods.ts`.

These are pure utility functions (no Ponder-specific imports):
- `BUCKET_SIZE` constants
- `getBucketId()` function
- `periodConfig` mapping

#### 9. Update client-side hooks to use Route Handlers

**File**: `packages/web/src/activity/fetch-activity-client.ts`
**Changes**: Replace `apiClient.get('/api/activity')` with `fetch('/api/activity')`.

```typescript
// Before
const response = await apiClient.get(`/api/activity?${searchParams.toString()}`);
return activityResponseSchema.parse(response.data);

// After
const response = await fetch(`/api/activity?${searchParams.toString()}`);
const data = await response.json();
return activityResponseSchema.parse(data);
```

**File**: `packages/web/src/flow-chart/queries/use-flow-chart-query.ts`
**Changes**: Replace `apiClient.get(...)` with `fetch(...)`.

**File**: `packages/web/src/vault-metrics/queries/use-vault-metrics-query.ts`
**Changes**: Replace `apiClient.get(...)` with `fetch(...)`.

**File**: `packages/web/src/depositors-list/queries/use-depositors-query.ts`
**Changes**: Replace `apiClient.get(...)` with `fetch(...)`.

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web build` succeeds (type-checks all route handlers)
- [ ] No TypeScript errors in route handlers

#### Manual Verification:
- [ ] Start Next.js dev server and Supabase locally
- [ ] Client-side activity infinite scroll works via `/api/activity` route handler
- [ ] Flow chart loads via `/api/vaults/[chainId]/[address]/flow-chart` route handler
- [ ] Vault metrics load via route handler
- [ ] Depositors list loads via route handler

**Implementation Note**: At this point, both the old Ponder API and new Route Handlers work simultaneously. The server-side fetches still use the Ponder API. Pause for manual verification that client-side hooks work correctly with the new Route Handlers.

---

## Phase 3: Migrate Server-Side Fetches

### Overview
Convert the server-side fetch functions (`fetch-vaults.ts`, `fetch-activity.ts`) to query Supabase directly using the shared client, instead of calling the Ponder REST API. RPC enrichment happens in the Next.js server layer.

### Changes Required:

#### 1. Rewrite `fetch-vaults.ts`

**File**: `packages/web/src/vault-directory/fetch-vaults.ts`
**Changes**: Replace HTTP fetch with direct Supabase queries + RPC enrichment.

The `fetchVaults()` function will:
1. Get vault list from `plasma-vaults.json` (via `vaults-registry.ts`)
2. Query Supabase in parallel: depositor counts, first deposit timestamps, 7d net flow from bucket tables
3. Fetch RPC data in parallel: totalAssets, totalSupply, asset info
4. Combine DB + RPC data into enriched vault objects
5. Apply filtering and sorting in-memory (same as current Ponder API logic)
6. Apply pagination

The `fetchVaultsMetadata()` function will:
1. Same parallel DB + RPC fetch
2. Compute ranges (max TVL, max depositors), collect unique chains/protocols/assets

Zod schemas for response types stay the same — they validate the data we construct.

#### 2. Rewrite `fetch-activity.ts`

**File**: `packages/web/src/activity/fetch-activity.ts`
**Changes**: Replace HTTP fetch with direct Supabase queries.

The `fetchActivity()` function will:
1. Query `deposit_event` and `withdrawal_event` from Supabase with filters
2. Implement cursor-based pagination using Supabase `.or()`, `.lt()`, `.order()`
3. Merge deposits and withdrawals, sort by timestamp
4. Enrich with RPC data for amount formatting

The `fetchActivityInflows()` function will:
1. Query deposit_event and withdrawal_event with timestamp filters for 1d, 7d, 30d
2. Use Supabase aggregate queries (or fetch and sum in JS)
3. Format amounts

The `fetchActivityMetadata()` function will:
1. Get chains and vaults from `vaults-registry.ts` (no DB query needed)

#### 3. Update environment variables

**File**: `packages/web/.env.example`
**Changes**: Remove `NEXT_PUBLIC_API_URL`, add Supabase and server-side RPC vars.

```
# Supabase Ponder Database
PONDER_DB_SUPABASE_URL=http://127.0.0.1:54341
PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# RPC URLs (server-side only, no NEXT_PUBLIC_ prefix)
RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/your-key
RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/your-key
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/your-key

# RPC URLs for client-side (wagmi)
NEXT_PUBLIC_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/your-key
NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/your-key
NEXT_PUBLIC_RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/your-key
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web build` succeeds
- [ ] No references to `NEXT_PUBLIC_API_URL` or `API_URL` in fetch-vaults.ts or fetch-activity.ts

#### Manual Verification:
- [ ] Vaults list page loads with correct TVL, depositor counts, net flows
- [ ] Vault filtering (by chain, protocol, asset, TVL range) works
- [ ] Vault sorting (TVL, depositors, age) works
- [ ] Activity page loads with deposits and withdrawals
- [ ] Activity inflows summary (1D, 7D, 30D) displays correct values
- [ ] Activity filtering (chains, vaults, type, min_amount) works
- [ ] Performance is acceptable (page load times similar to current)

**Implementation Note**: After this phase, the Next.js app no longer depends on the Ponder REST API. The Ponder process only needs to run for indexing. Pause for thorough manual verification of all pages.

---

## Phase 4: Cleanup

### Overview
Remove the Ponder REST API, Axios dependency, and unused code. Update documentation and env configs.

### Changes Required:

#### 1. Remove Ponder REST API

**Files to delete**:
- `packages/ponder/src/api/` — entire directory (all route handlers)

**File**: `packages/ponder/src/api/index.ts`
**Changes**: Keep only the GraphQL endpoint for dev.

```typescript
import { db } from 'ponder:api';
import schema from 'ponder:schema';
import { Hono } from 'hono';
import { graphql } from 'ponder';

const app = new Hono();

if (process.env.NODE_ENV === 'development') {
  app.use('/', graphql({ db, schema }));
}

export default app;
```

Wait — this means we delete all files under `src/api/vaults/` and `src/api/activity/` and `src/api/assets/`, but keep `src/api/index.ts` with just the GraphQL studio mount. The utility files under `src/utils/` that are only used by the API (like `validate-smart-contract-params.ts`, `validate-pagination.ts`, `validate-period.ts`, `cache.ts`) can also be deleted since they're only consumed by the API routes. Keep `src/utils/buckets.ts`, `src/utils/chains.ts`, `src/utils/periods.ts` if they're used by the indexing handlers, or delete them if only used by the API. Let's verify during implementation.

#### 2. Remove Axios from web package

**File**: `packages/web/package.json`
**Changes**: Remove `"axios": "1.10.0"` from dependencies.

**File to delete**: `packages/web/src/lib/api-client.ts`

#### 3. Remove `NEXT_PUBLIC_API_URL` references

**File**: `packages/web/.env` (if exists)
**Changes**: Remove `NEXT_PUBLIC_API_URL` line, add Supabase env vars.

#### 4. Remove old Drizzle files from supabase-ponder (if not done in Phase 1)

Verify these are gone:
- `packages/supabase-ponder/src/schema.ts`
- `packages/supabase-ponder/drizzle.config.ts`

#### 5. Update web package README/docs if any reference the API URL

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web build` succeeds
- [ ] `pnpm --filter @wgenie/fusion-ponder build` succeeds (ponder still builds for indexing)
- [ ] No imports of `apiClient` or `api-client` in web package
- [ ] No references to `NEXT_PUBLIC_API_URL` in web package
- [ ] No Drizzle imports in supabase-ponder package

#### Manual Verification:
- [ ] Full smoke test of all pages (vaults list, vault details, activity)
- [ ] All filtering, sorting, pagination works
- [ ] Infinite scroll works on activity page
- [ ] Flow charts render correctly
- [ ] Vault metrics display correctly
- [ ] Depositors list paginates correctly

---

## Supabase Query Translation Guide

For reference during implementation, here's how the current Ponder/Drizzle queries translate to `@supabase/supabase-js`:

### Depositor Count
```typescript
// Drizzle (current)
db.select({ count: sql`count(distinct depositor_address)` })
  .from(schema.depositor)
  .where(and(eq(chainId, X), eq(vaultAddress, Y), gt(shareBalance, 0n)))

// Supabase-js (target)
supabase.from('depositor')
  .select('depositor_address', { count: 'exact', head: true })
  .eq('chain_id', X)
  .eq('vault_address', Y)
  .gt('share_balance', 0)
```

### Activity List with Cursor Pagination
```typescript
// Supabase-js
let query = supabase.from('deposit_event')
  .select('id, chain_id, vault_address, receiver, assets, timestamp, transaction_hash')
  .order('timestamp', { ascending: false })
  .order('id', { ascending: false })
  .limit(limit + 1);

if (chainIds) query = query.in('chain_id', chainIds);
if (vaultAddresses) query = query.in('vault_address', vaultAddresses);
if (cursor) query = query.or(`timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.lt.${cursor.id})`);
```

### Bucket Aggregation (Inflows)
```typescript
// Supabase-js - note: supabase-js doesn't have native SUM aggregation
// Use RPC function or fetch rows and sum in JS
const { data } = await supabase.from('deposit_buckets_2_hours')
  .select('sum')
  .eq('chain_id', chainId)
  .eq('vault_address', address)
  .gte('bucket_id', startBucketId);

const total = data?.reduce((acc, row) => acc + BigInt(row.sum), 0n) ?? 0n;
```

### Flow Chart Data
```typescript
// Supabase-js
const { data: deposits } = await supabase.from(`deposit_buckets_${bucketTable}`)
  .select('bucket_id, sum, count')
  .eq('chain_id', chainId)
  .eq('vault_address', address)
  .gte('bucket_id', startBucketId);
```

## Performance Considerations

- **Supabase-js vs Drizzle**: supabase-js uses the PostgREST HTTP API (port 54341) while Drizzle connects directly to PostgreSQL (port 54342). For read-heavy queries, PostgREST is well-optimized with connection pooling.
- **Aggregation queries**: supabase-js doesn't have `SUM()` natively. For inflows, we either:
  - Fetch bucket rows and sum in JS (acceptable for ~100 rows per vault)
  - Create a Postgres function and call via `.rpc()` (better for large datasets)
  - Start with JS summation, optimize later if needed
- **RPC caching**: The RPC enrichment layer should use `unstable_cache` from Next.js or simple in-memory cache with TTL to avoid hitting RPC nodes on every request.
- **Next.js caching**: Server-side fetches use `next: { revalidate: N }` for ISR. Route handlers use `NextResponse` with appropriate `Cache-Control` headers.

## Migration Notes

### Environment Variables Mapping
| Old | New | Used By |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | (removed) | — |
| `PONDER_DB_DATABASE_URL` | `PONDER_DB_SUPABASE_URL` + `PONDER_DB_SUPABASE_SERVICE_ROLE_KEY` | supabase-ponder, web |
| `NEXT_PUBLIC_RPC_URL_*` | Keep + add `RPC_URL_*` (server-side) | web (client + server) |

### Database Column Naming
Ponder uses snake_case for DB columns but camelCase in schema definitions. The Supabase-generated types will use snake_case (matching actual DB columns):
- `chainId` → `chain_id`
- `vaultAddress` → `vault_address`
- `depositorAddress` → `depositor_address`
- `shareBalance` → `share_balance`
- `transactionHash` → `transaction_hash`
- `bucketId` → `bucket_id`

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0012-next-reads-from-supabase.md`
- Reference implementation: `/Users/kuba/code/bajki-creator/packages/app-db/`
- Supabase config: `packages/supabase-ponder/supabase/config.toml` (API port 54341, DB port 54342)
- Ponder schema: `packages/ponder/ponder.schema.ts`
- Vault registry: `plasma-vaults.json`
