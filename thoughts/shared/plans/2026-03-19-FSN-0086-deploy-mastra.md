# FSN-0086: Deploy Mastra — Implementation Plan

## Overview

Deploy the Mastra AI agent server (`packages/mastra`) to a remote environment. Slim down the bundle by removing unused agents/workflow/dependencies, then deploy via a tiered strategy: Vercel Enhanced Builds first, Railway second, GitHub Actions + prebuilt third.

## Current State Analysis

### What's Ready
- `VercelDeployer` configured in `packages/mastra/src/mastra/index.ts:16` with `regions: ['fra1']`
- Turso storage helper in `packages/mastra/src/storage.ts` with remote/local fallback
- `packages/mastra/vercel.json` with monorepo install/build commands
- Vercel project `fusion-monorepo-mastra` (prj_gQvmjpWHJ9W2qZUtTPsKnoPhZlbJ) linked
- Env vars set in Vercel production: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `OPENROUTER_API_KEY`, `MODEL`, `BASE_RPC_URL`, `ETHEREUM_RPC_URL`, `ARBITRUM_RPC_URL`
- Enhanced Builds enabled on Pro plan (16GB RAM, 8 CPUs)

### The Blocker
`mastra build` OOMs on Vercel. Six approaches tried, all failed (see `thoughts/kuba/tickets/fsn_0086-deploy-mastra.md`). Enhanced Builds + proper `NODE_OPTIONS` not yet tried together.

### Key Discoveries
- `sqlAgent` and `plasmaVaultAgent` require `PONDER_DATABASE_URL` (local Postgres) — dead weight for deployment
- `databaseQueryWorkflow` depends on the same SQL tools — also dead weight
- `@mastra/evals` is in `package.json` but never imported — unused dependency
- `pg` is only imported by `src/tools/database-introspection-tool.ts` and `src/tools/sql-execution-tool.ts` — both used exclusively by `sqlAgent`
- `.mastra/` already has a successful local build (~76MB, 211 bundled modules)
- `@wgenie/fusion-sdk` must be built before `mastra build` (workspace dep outputs to `dist/`)

## Desired End State

- Mastra server running at a public URL (Vercel or Railway)
- Only `alphaAgent` and `yoTreasuryAgent` registered (functional agents)
- `curl https://<mastra-url>/api/agents` returns agent list
- Chat endpoints stream responses correctly
- Working memory persists between messages (Turso)

### Verification:
- `curl https://<mastra-url>/api/agents` → JSON with `alphaAgent`, `yoTreasuryAgent`
- `curl -X POST https://<mastra-url>/chat/alphaAgent` with test message → streaming response
- Web app at `MASTRA_SERVER_URL=<url>` proxies chat correctly

## What We're NOT Doing

- Deploying `sqlAgent`, `plasmaVaultAgent`, or `databaseQueryWorkflow` (require local Postgres)
- Deploying the web app (separate ticket, depends on Mastra URL)
- Setting up CI/CD auto-deploy on push (can add later)
- Custom domains
- Auth/protection of the Mastra API

---

## Phase 1: Slim Down & Verify Local Build

### Overview
Remove unused agents, workflow, and dependencies from the Mastra instance. Verify the build succeeds locally with reduced bundle size.

### Changes Required:

#### 1. Update Mastra instance — remove unused agents and workflow

**File**: `packages/mastra/src/mastra/index.ts`

Remove imports for `sqlAgent`, `plasmaVaultAgent`, and `databaseQueryWorkflow`. Remove them from the Mastra config:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { VercelDeployer } from '@mastra/deployer-vercel';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { chatRoute } from '@mastra/ai-sdk';
import { alphaAgent } from '../agents/alpha-agent';
import { yoTreasuryAgent } from '../agents/yo-treasury-agent';
import { createStorage } from '../storage';

export const mastra = new Mastra({
  agents: { alphaAgent, yoTreasuryAgent },
  deployer: new VercelDeployer({
    regions: ['fra1'],
    maxDuration: 60,
  }),
  storage: createStorage('mastra-storage'),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
  server: {
    cors: {
      origin: '*',
      allowMethods: ['*'],
      allowHeaders: ['*'],
    },
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
```

#### 2. Update agents index — keep all exports for backward compat

**File**: `packages/mastra/src/agents/index.ts`

No change needed. The `index.ts` exports all 4 agents for consumers that import `@wgenie/fusion-mastra/agents`. The Mastra instance just won't register `sqlAgent` and `plasmaVaultAgent` — they won't be served via the HTTP API, but the exports remain for any code that imports them directly (e.g., local dev, tests).

#### 3. Remove unused dependencies

**File**: `packages/mastra/package.json`

Remove from `dependencies`:
- `pg` — only used by SQL tools (sqlAgent), not needed at runtime since agents are unregistered
- `@mastra/evals` — never imported anywhere

Remove from `devDependencies`:
- `@types/pg` — no longer needed without `pg`

#### 4. Clean and rebuild

```bash
cd packages/mastra
rm -rf .mastra node_modules
cd ../..
pnpm install
pnpm --filter @wgenie/fusion-sdk build
cd packages/mastra
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm install` succeeds without errors (lockfile updates cleanly)
- [ ] `pnpm --filter @wgenie/fusion-sdk build` succeeds
- [ ] `NODE_OPTIONS="--max-old-space-size=8192" pnpm --filter @wgenie/fusion-mastra build` succeeds
- [ ] Build output in `.mastra/` is smaller than before (fewer bundled modules)

#### Manual Verification:
- [ ] `cd packages/mastra && pnpm dev` starts successfully
- [ ] Only `alphaAgent` and `yoTreasuryAgent` appear in Mastra Studio
- [ ] Chat with Alpha Agent works as before
- [ ] Chat with YO Treasury Agent works as before

**Implementation Note**: After completing this phase and all verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Deploy to Vercel with Enhanced Builds

### Overview
Attempt deployment using Vercel's Enhanced Builds (16GB RAM, 8 CPUs) with `NODE_OPTIONS` to raise the Node heap limit. This is the simplest path since the project is already linked and configured.

### Steps:

#### 1. Set NODE_OPTIONS as Vercel build environment variable

```bash
cd packages/mastra
vercel env add NODE_OPTIONS
# Value: --max-old-space-size=12288
# Scope: Production, Preview, Development
```

Or via Vercel dashboard: Project Settings → Environment Variables → Add `NODE_OPTIONS` = `--max-old-space-size=12288`.

**Important**: This must be a **Build** environment variable (available during build), not just a runtime var.

#### 2. Verify Enhanced Builds is enabled

In Vercel dashboard: Project Settings → Build & Development → Enhanced Builds toggle must be ON.

#### 3. Deploy

```bash
cd packages/mastra
vercel --prod
```

#### 4. If build succeeds — verify

```bash
# Check agents endpoint
curl https://fusion-monorepo-mastra.vercel.app/api/agents

# Test chat (should return streaming response)
curl -X POST https://fusion-monorepo-mastra.vercel.app/chat/alphaAgent \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Success Criteria:

#### Automated Verification:
- [ ] `vercel --prod` completes without OOM (exit code 0)
- [ ] `curl https://<url>/api/agents` returns JSON with `alphaAgent` and `yoTreasuryAgent`

#### Manual Verification:
- [ ] Chat with alphaAgent via curl returns streaming text
- [ ] Vercel function logs show no errors

**Implementation Note**: If the build still OOMs (exit 134 or 137), skip to Phase 3 (Railway). Do NOT spend more time debugging Vercel build limits.

---

## Phase 3: Railway Fallback

### Overview
Deploy Mastra as a long-running Node.js server on Railway. No serverless limits, no native binary platform issues, no build memory constraints. Railway builds on Linux with configurable resources.

### Steps:

#### 1. Remove VercelDeployer (not needed for Railway)

**File**: `packages/mastra/src/mastra/index.ts`

Remove the `deployer` field and `@mastra/deployer-vercel` import:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { chatRoute } from '@mastra/ai-sdk';
import { alphaAgent } from '../agents/alpha-agent';
import { yoTreasuryAgent } from '../agents/yo-treasury-agent';
import { createStorage } from '../storage';

export const mastra = new Mastra({
  agents: { alphaAgent, yoTreasuryAgent },
  storage: createStorage('mastra-storage'),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
  server: {
    cors: {
      origin: '*',
      allowMethods: ['*'],
      allowHeaders: ['*'],
    },
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
```

#### 2. Remove `@mastra/deployer-vercel` from dependencies

**File**: `packages/mastra/package.json`

Remove `"@mastra/deployer-vercel"` from dependencies.

#### 3. Build locally to verify

```bash
cd packages/mastra
rm -rf .mastra
cd ../..
pnpm install
pnpm --filter @wgenie/fusion-sdk build
cd packages/mastra
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
```

Verify the build output:
```bash
ls -la .mastra/output/
# Should contain: index.mjs, mastra.mjs, package.json, node_modules/
node .mastra/output/index.mjs
# Should start the Hono server on port 4111
```

#### 4. Create Railway project

```bash
# Install Railway CLI if needed
brew install railway

# Login
railway login

# Create project
railway init
# Project name: fusion-monorepo-mastra
```

#### 5. Add Dockerfile for monorepo build

**File**: `packages/mastra/Dockerfile`

```dockerfile
FROM node:22-slim AS base
RUN npm install -g pnpm@10.28.2

# Copy full monorepo (needed for workspace deps)
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/mastra/package.json packages/mastra/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/sdk/ packages/sdk/
COPY packages/mastra/ packages/mastra/

# Build SDK first (workspace dep)
RUN pnpm --filter @wgenie/fusion-sdk build

# Build Mastra with extra heap
RUN NODE_OPTIONS="--max-old-space-size=8192" pnpm --filter @wgenie/fusion-mastra build

# Production stage
FROM node:22-slim
WORKDIR /app
COPY --from=base /app/packages/mastra/.mastra/output ./

EXPOSE 4111
CMD ["node", "index.mjs"]
```

#### 6. Configure Railway environment variables

In Railway dashboard or CLI:
```bash
railway variables set OPENROUTER_API_KEY=sk-or-v1-...
railway variables set MODEL=openrouter/anthropic/claude-haiku-4.5
railway variables set TURSO_DATABASE_URL=libsql://fusion-monorepo-mastra-lebrande.aws-eu-west-1.turso.io
railway variables set TURSO_AUTH_TOKEN=...
railway variables set BASE_RPC_URL=https://...
railway variables set ETHEREUM_RPC_URL=https://...
railway variables set ARBITRUM_RPC_URL=https://...
railway variables set PORT=4111
```

#### 7. Deploy

```bash
cd packages/mastra
railway up
```

Or link to GitHub for auto-deploy. Railway will detect the Dockerfile and build accordingly.

#### 8. Verify

```bash
RAILWAY_URL=$(railway domain)
curl https://$RAILWAY_URL/api/agents
curl -X POST https://$RAILWAY_URL/chat/alphaAgent \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Success Criteria:

#### Automated Verification:
- [ ] Docker build completes without errors
- [ ] `railway up` deploys successfully
- [ ] `curl https://<railway-url>/api/agents` returns JSON with `alphaAgent` and `yoTreasuryAgent`

#### Manual Verification:
- [ ] Chat with alphaAgent returns streaming response
- [ ] Chat with yoTreasuryAgent returns streaming response
- [ ] Working memory persists between messages (Turso)
- [ ] Tool calls execute successfully (RPC reads, Odos API)

**Implementation Note**: After Railway deployment works, update the web app's `MASTRA_SERVER_URL` env var to the Railway URL instead of Vercel.

---

## Phase 4: GitHub Actions + Prebuilt Deploy (if needed for Vercel)

### Overview
If we want Vercel specifically (e.g., for consistency with the web app), build on a GitHub Actions Linux runner and deploy prebuilt. This solves both OOM (configurable heap) and native binary issues (Linux build = Linux binaries).

### Steps:

#### 1. Restore VercelDeployer in index.ts (if removed in Phase 3)

Re-add `deployer: new VercelDeployer(...)` and `@mastra/deployer-vercel` dependency.

#### 2. Create GitHub Actions workflow

**File**: `.github/workflows/deploy-mastra.yml`

```yaml
name: Deploy Mastra to Vercel

on:
  workflow_dispatch:
  push:
    branches: [master]
    paths:
      - 'packages/mastra/**'
      - 'packages/sdk/**'

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_MASTRA_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - uses: pnpm/action-setup@v4
        with:
          version: 10.28.2

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build SDK
        run: pnpm --filter @wgenie/fusion-sdk build

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/mastra

      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/mastra
        env:
          NODE_OPTIONS: '--max-old-space-size=6144'

      - name: Deploy prebuilt
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/mastra
```

#### 3. Set GitHub secrets

| Secret | Value | Where to find |
|--------|-------|---------------|
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `team_HEIDGELjP9K106pLXQz6kh7T` | `packages/mastra/.vercel/project.json` |
| `VERCEL_MASTRA_PROJECT_ID` | `prj_gQvmjpWHJ9W2qZUtTPsKnoPhZlbJ` | `packages/mastra/.vercel/project.json` |

#### 4. Trigger deploy

Push to master (if paths match) or manually trigger via GitHub Actions UI.

### Success Criteria:

#### Automated Verification:
- [ ] GitHub Actions workflow completes (green check)
- [ ] `curl https://fusion-monorepo-mastra.vercel.app/api/agents` returns agent list

#### Manual Verification:
- [ ] Streaming chat works through Vercel functions
- [ ] No FUNCTION_INVOCATION_FAILED errors (native binaries are Linux)

---

## Testing Strategy

### After Any Successful Deploy:
1. `curl /api/agents` — verify agent list
2. `curl -X POST /chat/alphaAgent` — verify streaming response
3. `curl -X POST /chat/yoTreasuryAgent` — verify streaming response
4. Send multi-turn conversation — verify Turso memory persists
5. Trigger a tool call (e.g., ask Alpha Agent about a vault) — verify RPC calls work
6. Update web app `MASTRA_SERVER_URL` — verify proxy works end-to-end

### Rollback Plan:
- Vercel: instant rollback via dashboard
- Railway: `railway rollback` or redeploy previous commit
- Local dev unaffected (storage falls back to `file:./mastra.db`, web falls back to `localhost:4111`)

---

## References

- Ticket: `thoughts/kuba/tickets/fsn_0086-deploy-mastra.md`
- Parent plan: `thoughts/shared/plans/2026-03-19-FSN-0085-deploy-to-vercel.md`
- [Mastra Deploy to Vercel](https://mastra.ai/guides/deployment/vercel)
- [Mastra Server Deployment](https://mastra.ai/docs/deployment/mastra-server)
- [Vercel Enhanced Builds](https://vercel.com/changelog/faster-builds-now-available-with-compute-upgrades-on-paid-plans)
- [Vercel + GitHub Actions prebuilt](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Mastra OOM context](https://github.com/mastra-ai/mastra/issues/2752)
