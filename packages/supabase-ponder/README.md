# @wgenie/fusion-supabase-ponder

Drizzle ORM client for the Ponder database, storing blockchain indexed data from ERC4626 vault events.

## Features

- **Type-safe Drizzle ORM** — Full type safety with Drizzle ORM ([Supabase Drizzle docs](https://supabase.com/docs/guides/database/drizzle))
- **Blockchain event storage** — Transfer, deposit, and withdraw events from multiple chains
- **Vault metrics** — Aggregated data for vault performance analysis
- **Depositor tracking** — Monitor depositor positions and activity

## Environment Variables

Create a `.env` file in the project root:

```env
# Ponder Database connection string (for Drizzle ORM)
PONDER_DB_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres
```

Or use the connection pooler:

```env
PONDER_DB_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54339/postgres
```

| Variable | Description |
|----------|-------------|
| `PONDER_DB_DATABASE_URL` | Direct PostgreSQL connection string (preferred) |
| `PONDER_DATABASE_URL` | Fallback if `PONDER_DB_DATABASE_URL` is not set |

> **Note:** These use the `PONDER_DB_` prefix to avoid conflicts with other databases (e.g., Mastra, app data).

### Local Development (Default)

For local development with `supabase start`:

```env
# Direct database connection (port 54332)
PONDER_DB_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres

# Or use connection pooler (port 54339, if enabled)
# PONDER_DB_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54339/postgres
```

These are the standard Supabase local development credentials and are safe to commit.

## Supabase Project Setup

### 1. Initialize Local Supabase

```bash
cd packages/supabase-ponder
supabase init
supabase start
```

This will:
- Start a local Supabase instance on port 54331 (API) and 54332 (database)
- Create the project with ID `fusion-ponder-db`
- Expose Supabase Studio on port 54333

### 2. Connect Ponder to Supabase

Update your `.env` file in the project root to use the Supabase connection string:

```env
# Ponder indexer will use this for indexing blockchain events
# Points to the Supabase PostgreSQL database (port 54332)
PONDER_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres

# This package uses the same URL for Drizzle ORM access
PONDER_DB_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres
```

**Important:** Both Ponder and this package use the same Supabase database. The ports are:
- **54331** - Supabase API (REST, used by MCP)
- **54332** - PostgreSQL database (used by Ponder and Drizzle)
- **54333** - Supabase Studio (database browser)

### 3. Ponder Schema

Ponder will automatically create tables based on `packages/ponder/ponder.schema.ts` when you run:

```bash
pnpm dev:ponder
```

The schema includes:
- `transfer_event` — ERC4626 transfer events
- `deposit_event` — Deposit events with bucket aggregations
- `withdraw_event` — Withdraw events
- `depositor` — Depositor positions and activity

## Usage

```typescript
import { db, transferEvent, depositEvent, depositor } from '@wgenie/fusion-supabase-ponder';
import { eq, desc } from 'drizzle-orm';

// Fetch all transfer events
const transfers = await db
  .select()
  .from(transferEvent)
  .limit(100);

// Get deposits for a specific vault
const deposits = await db
  .select()
  .from(depositEvent)
  .where(eq(depositEvent.vaultAddress, '0x...'))
  .orderBy(desc(depositEvent.timestamp));

// Get depositor information
const depositors = await db
  .select()
  .from(depositor)
  .where(eq(depositor.chainId, 1))
  .orderBy(desc(depositor.shareBalance));
```

## Schema Management

The `src/schema.ts` file contains Drizzle schema definitions that mirror Ponder's schema.

### Drizzle Kit Commands

```bash
# Generate migrations (if needed)
pnpm --filter @wgenie/fusion-supabase-ponder db:generate

# Push schema changes (if needed)
pnpm --filter @wgenie/fusion-supabase-ponder db:push

# Open Drizzle Studio (database browser)
pnpm --filter @wgenie/fusion-supabase-ponder db:studio
```

> **Note:** Ponder manages its own schema creation. The Drizzle schema here is for type-safe querying, not migrations.

## Testing

```bash
pnpm --filter @wgenie/fusion-supabase-ponder test
```

This verifies:
- Database connection
- Tables exist and are accessible (if Ponder has created them)

## Troubleshooting

| Error | Solution |
|-------|----------|
| Missing database connection | Set `PONDER_DB_DATABASE_URL` or `PONDER_DATABASE_URL` in `.env` |
| relation 'transfer_event' does not exist | Run `pnpm dev:ponder` to start Ponder indexing, which will create tables |
| Connection refused | Ensure Supabase is running: `cd packages/supabase-ponder && supabase start` |
| Port 54332 already in use | Another database instance may be running. Check with `supabase status` |

## License

ISC
