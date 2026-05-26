# Remote Supabase Connection — Implementation Plan

## Overview

Add the ability to run all packages (Ponder, Next.js, Mastra) against a remote Supabase SaaS instance while keeping the local Supabase dev setup intact. Two modes: local (default) and remote, switchable via package.json scripts using `dotenv-cli`.

## Current State Analysis

Three env vars control all Supabase connections:

| Env Var | Used By | Purpose | Local Value |
|---------|---------|---------|-------------|
| `PONDER_DATABASE_URL` | Ponder, Mastra | PostgreSQL direct connection | `postgresql://postgres:postgres@127.0.0.1:54342/postgres` |
| `PONDER_DB_SUPABASE_URL` | Next.js (via `@wgenie/fusion-supabase-ponder`) | Supabase REST API | `http://127.0.0.1:54341` |
| `PONDER_DB_SUPABASE_SERVICE_ROLE_KEY` | Next.js (via `@wgenie/fusion-supabase-ponder`) | Service role JWT | local demo key |

Each package has its own `.env` file with local values. No mechanism exists to switch to remote.

### Key Discoveries:

- `supabase-ponder` client (`packages/supabase-ponder/src/client.ts:11-12`) reads env vars at module load — works with any URL, no code changes needed
- Ponder config (`packages/ponder/ponder.config.ts:9`) uses `PONDER_DATABASE_URL` — works with any Postgres connection string
- Mastra env (`packages/mastra/src/env.ts:16-18`) validates `PONDER_DATABASE_URL` as a URL — works with remote
- Framework `.env` files don't override already-set env vars, so `dotenv-cli` takes precedence

## Desired End State

- `pnpm dev:web` / `dev:ponder` / `dev:mastra` — runs against **local** Supabase (unchanged)
- `pnpm dev:web:remote` / `dev:ponder:remote` / `dev:mastra:remote` — runs against **remote** Supabase SaaS
- `.env.remote` file (gitignored) holds remote credentials
- `.env.remote.example` (committed) documents the required vars

## What We're NOT Doing

- Not changing any application code or client libraries
- Not adding remote type generation
- Not adding CI/CD or deployment automation
- Not modifying the local Supabase setup

## Implementation Approach

Use `dotenv-cli` to inject remote env vars before the framework starts. Since Next.js, Ponder, and Mastra all respect already-set env vars over `.env` file values, this cleanly overrides local settings.

## Phase 1: Setup

### Changes Required:

#### 1. Install dotenv-cli

```bash
pnpm add -Dw dotenv-cli
```

#### 2. Add `.env.remote` to `.gitignore`

**File**: `.gitignore`

Add under the "Environment files" section:

```
.env.remote
```

#### 3. Create `.env.remote.example`

**File**: `.env.remote.example` (committed template)

```env
# ===========================================
# Remote Supabase Configuration
# ===========================================
# Copy this file to .env.remote and fill in your values
# from the Supabase dashboard: https://supabase.com/dashboard

# PostgreSQL direct connection (Settings > Database > Connection string > URI)
# Used by: Ponder (writes), Mastra (reads)
PONDER_DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

# Supabase REST API URL (Settings > API > Project URL)
# Used by: Next.js (reads via supabase-js)
PONDER_DB_SUPABASE_URL=https://<project-ref>.supabase.co

# Service Role Key (Settings > API > service_role key)
# Used by: Next.js (server-side access, bypasses RLS)
PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### 4. Add remote scripts to root `package.json`

**File**: `package.json`

Add these scripts alongside the existing ones:

```json
"dev:web:remote": "dotenv -e .env.remote -- pnpm dev:web",
"dev:ponder:remote": "dotenv -e .env.remote -- pnpm dev:ponder",
"dev:mastra:remote": "dotenv -e .env.remote -- pnpm dev:mastra"
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm install` succeeds (dotenv-cli installed)
- [ ] `.env.remote.example` exists and is tracked by git
- [ ] `.env.remote` is in `.gitignore`
- [ ] All 3 remote scripts exist in `package.json`
- [ ] `pnpm dev:web` still works (local mode unchanged)

#### Manual Verification:

- [ ] Create `.env.remote` from the example, fill in real remote Supabase credentials
- [ ] `pnpm dev:ponder:remote` starts Ponder and it connects to remote Supabase, creates tables, begins indexing
- [ ] `pnpm dev:web:remote` starts Next.js and reads data from remote Supabase
- [ ] `pnpm dev:mastra:remote` starts Mastra and connects to remote Postgres
- [ ] Local mode (`pnpm dev:web`) continues to work against local Supabase

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0027-remote-supabase.md`
- Supabase client: `packages/supabase-ponder/src/client.ts`
- Ponder config: `packages/ponder/ponder.config.ts`
- Mastra env: `packages/mastra/src/env.ts`
