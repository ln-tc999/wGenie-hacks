# Deploy to Vercel — Implementation Plan

## Overview

Deploy two Vercel projects from this pnpm monorepo:
1. **Web** (`packages/web`) — Next.js app, `yo` config only
2. **Mastra** (`packages/mastra`) — AI agent server via `@mastra/deployer-vercel`

Ponder stays local, writing to remote Supabase. The web app currently imports Mastra agents directly — this must be decoupled so each deploys independently.

## Current State Analysis

### Web → Mastra coupling (must break)
- `src/app/api/vaults/[chainId]/[address]/chat/route.ts:5` — imports `alphaAgent` from `@wgenie/fusion-mastra/agents`
- `src/app/api/yo/treasury/chat/route.ts:5` — imports `yoTreasuryAgent` from `@wgenie/fusion-mastra/agents`
- 3 files import types from `@wgenie/fusion-mastra/alpha-types` (type-only, fine for build)

### Mastra storage (must change)
- `packages/mastra/src/mastra/index.ts:15` — `LibSQLStore({ url: "file:./mastra.db" })`
- `packages/mastra/src/agents/alpha-agent.ts:19` — `LibSQLStore({ url: "file:./mastra.db" })`
- `packages/mastra/src/agents/yo-treasury-agent.ts:16` — `LibSQLStore({ url: "file:./mastra.db" })`
- Local SQLite will NOT work on Vercel serverless (ephemeral filesystem)

### SDK build step (must handle)
- `@wgenie/fusion-sdk` outputs to `dist/` via `tsc --build` — dist not committed
- Must be built before `next build` on Vercel

### Key Discoveries
- Lockfile version `9.0` → Vercel auto-selects pnpm 10 (supports catalog feature)
- Root `package.json` has no `packageManager` field — should add for Corepack
- `next.config.ts` is minimal — needs `transpilePackages` for workspace TS packages
- Mastra already exposes `/chat/:agentId` via `chatRoute()` in `src/mastra/index.ts:43-45`
- Mastra has `@mastra/deployer-vercel` (official, generates Vercel Build Output API v3)

## Desired End State

- **Web app** deployed on Vercel at a public URL, running `yo` config
- **Mastra server** deployed on Vercel as serverless functions at a separate URL
- Web proxies agent chat requests to Mastra via HTTP (no direct imports)
- Mastra uses Turso (remote LibSQL) for storage instead of local SQLite
- Both projects auto-deploy on push to `master`
- Ponder runs locally, writes to remote Supabase

### Verification:
- `https://<web-project>.vercel.app` loads the YO app
- `https://<mastra-project>.vercel.app/api/agents` returns agent list
- Chat in vault detail page streams responses via Mastra proxy
- YO Treasury chat streams responses via Mastra proxy

## What We're NOT Doing

- Deploying Ponder (stays local, writes to remote Supabase)
- Deploying SQL Agent or Plasma Vault Agent (they require `PONDER_DATABASE_URL` which is local Postgres — they'll be available but non-functional without that env var)
- Setting up custom domains
- CI/CD beyond Vercel's built-in git integration
- Authentication/protection of the Mastra API (can add later)
- Multiple app configs — only `yo` for now

## Implementation Approach

Use Turso (remote LibSQL) as the minimal-change storage migration. Use raw `fetch()` proxy in Next.js route handlers to forward chat requests to remote Mastra — avoids adding `@mastra/client-js` dependency and keeps the pattern simple. Use `@mastra/deployer-vercel` for Mastra deployment.

---

## Phase 1: Mastra — Switch to Turso + Add VercelDeployer

### Overview
Replace local SQLite with Turso remote LibSQL and add the Vercel deployer. This makes Mastra deployable to Vercel while keeping local dev working.

### Changes Required:

#### 1. Install new dependencies

```bash
cd packages/mastra
pnpm add @mastra/deployer-vercel@latest
```

#### 2. Update env schema

**File**: `packages/mastra/src/env.ts`
**Changes**: Add Turso env vars (optional for local dev, required for Vercel)

```typescript
const envSchema = z.object({
  // ... existing fields ...

  /**
   * Turso remote LibSQL URL (required for Vercel deployment)
   * Falls back to local file:./mastra.db for local development
   * Example: libsql://your-db-name.turso.io
   */
  TURSO_DATABASE_URL: z.string().optional(),

  /**
   * Turso auth token (required when TURSO_DATABASE_URL is set)
   */
  TURSO_AUTH_TOKEN: z.string().optional(),
});
```

#### 3. Create storage helper

**File**: `packages/mastra/src/storage.ts` (new file)
**Changes**: Centralize LibSQLStore creation with Turso/local fallback

```typescript
import { LibSQLStore } from '@mastra/libsql';
import { env } from './env';

export function createStorage(id: string) {
  return new LibSQLStore({
    id,
    url: env.TURSO_DATABASE_URL ?? 'file:./mastra.db',
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
```

#### 4. Update Mastra instance

**File**: `packages/mastra/src/mastra/index.ts`
**Changes**: Add VercelDeployer, use shared storage helper

```typescript
import { VercelDeployer } from '@mastra/deployer-vercel';
import { createStorage } from '../storage';

export const mastra = new Mastra({
  // ... existing agents, workflows, logger, observability, server ...
  deployer: new VercelDeployer(),
  storage: createStorage('mastra-storage'),
});
```

#### 5. Update Alpha Agent

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Use shared storage helper instead of inline LibSQLStore

Replace:
```typescript
import { LibSQLStore } from '@mastra/libsql';
// ...
const memory = new Memory({
  storage: new LibSQLStore({
    id: 'alpha-agent-memory',
    url: 'file:./mastra.db',
  }),
  // ...
});
```

With:
```typescript
import { createStorage } from '../storage';
// ...
const memory = new Memory({
  storage: createStorage('alpha-agent-memory'),
  // ...
});
```

#### 6. Update YO Treasury Agent

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts`
**Changes**: Same pattern as Alpha Agent

Replace:
```typescript
import { LibSQLStore } from '@mastra/libsql';
// ...
const memory = new Memory({
  storage: new LibSQLStore({
    id: 'yo-treasury-agent-memory',
    url: 'file:./mastra.db',
  }),
  // ...
});
```

With:
```typescript
import { createStorage } from '../storage';
// ...
const memory = new Memory({
  storage: createStorage('yo-treasury-agent-memory'),
  // ...
});
```

#### 7. Update `.env.example`

**File**: `packages/mastra/.env.example`
**Changes**: Add Turso section

```
# =============================================================================
# Storage — Turso remote LibSQL (required for Vercel, optional for local dev)
# =============================================================================
# Falls back to file:./mastra.db when not set
# TURSO_DATABASE_URL=libsql://your-db-name.turso.io
# TURSO_AUTH_TOKEN=your-auth-token
```

#### 8. Add vercel.json for Mastra

**File**: `packages/mastra/vercel.json` (new file)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm --filter @wgenie/fusion-sdk build && pnpm --filter @wgenie/fusion-mastra build"
}
```

Note: SDK must be built first because Mastra depends on it (`@wgenie/fusion-sdk: workspace:*`).

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && pnpm dev` still works locally (falls back to `file:./mastra.db`)
- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] `pnpm --filter @wgenie/fusion-mastra build` succeeds (mastra build)

#### Manual Verification:
- [ ] Chat with Alpha Agent in Mastra Studio works as before
- [ ] Chat with YO Treasury Agent works as before

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Web — Decouple Agent Chat from Mastra Imports

### Overview
Replace direct Mastra agent imports in the 2 chat route handlers with HTTP proxy to remote Mastra server. The type-only imports from `@wgenie/fusion-mastra/alpha-types` stay (they're only needed at build time).

### Changes Required:

#### 1. Update web `.env.example`

**File**: `packages/web/.env.example`
**Changes**: Add Mastra server URL

```
# =============================================================================
# Mastra — Agent server (for AI chat proxy)
# =============================================================================
# --- Local ---
MASTRA_SERVER_URL=http://localhost:4111
# --- Remote (uncomment to use, comment out local above) ---
# MASTRA_SERVER_URL=https://your-mastra-project.vercel.app
```

#### 2. Rewrite Alpha Chat route handler

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
**Changes**: Replace direct agent import with HTTP proxy to Mastra server

```typescript
import { NextRequest } from 'next/server';
import { isAddress } from 'viem';
import { getVaultFromRegistry, getChainName } from '@/lib/vaults-registry';
import { isValidChainId } from '@/app/chains.config';

const MASTRA_URL = process.env.MASTRA_SERVER_URL ?? 'http://localhost:4111';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (
    isNaN(chainId) ||
    !isValidChainId(chainId) ||
    !isAddress(address, { strict: false })
  ) {
    return new Response('Invalid parameters', { status: 400 });
  }

  const vault = getVaultFromRegistry(chainId, address);
  const chainName = getChainName(chainId);
  const { messages, callerAddress } = await request.json();

  const callerContext =
    callerAddress && isAddress(callerAddress, { strict: false })
      ? ` The user's connected wallet (callerAddress for simulation) is ${callerAddress}.`
      : '';
  const vaultContext = `CURRENT VAULT CONTEXT: The user is viewing vault "${vault?.name ?? 'Unknown'}" at address ${address} on ${chainName} (chainId: ${chainId}). When the user asks about "this vault", use this context.${callerContext}`;

  const threadId = `vault-${chainId}-${address.toLowerCase()}`;

  // Prepend system context as a system message
  const augmentedMessages = [
    { role: 'system', content: vaultContext },
    ...messages,
  ];

  try {
    const upstream = await fetch(`${MASTRA_URL}/chat/alphaAgent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: augmentedMessages,
        maxSteps: 10,
        memory: { thread: threadId, resource: threadId },
      }),
      signal: request.signal,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error');
      console.error('Mastra server error:', upstream.status, errorText);
      return new Response('Agent server error', { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error proxying to Mastra', error);
    return new Response('An error occurred while processing your request.', {
      status: 500,
    });
  }
}
```

#### 3. Rewrite YO Treasury Chat route handler

**File**: `packages/web/src/app/api/yo/treasury/chat/route.ts`
**Changes**: Same pattern — HTTP proxy to Mastra

```typescript
import { NextRequest } from 'next/server';
import { isAddress } from 'viem';

const MASTRA_URL = process.env.MASTRA_SERVER_URL ?? 'http://localhost:4111';

export async function POST(request: NextRequest) {
  const { messages, callerAddress, vaultAddress, chainId } = await request.json();

  const callerContext =
    callerAddress && isAddress(callerAddress, { strict: false })
      ? ` The user's connected wallet (callerAddress for simulation) is ${callerAddress}.`
      : '';
  const vaultContext =
    vaultAddress && isAddress(vaultAddress, { strict: false })
      ? ` The user's treasury vault address is ${vaultAddress} on chainId ${chainId}.`
      : ' The user has not created a treasury vault yet.';
  const system = `CURRENT CONTEXT:${callerContext}${vaultContext} Chain: ${chainId ?? 8453} (Base).`;

  const threadId = callerAddress
    ? `yo-treasury-${callerAddress.toLowerCase()}`
    : 'yo-treasury-anonymous';

  const augmentedMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  try {
    const upstream = await fetch(`${MASTRA_URL}/chat/yoTreasuryAgent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: augmentedMessages,
        maxSteps: 10,
        memory: { thread: threadId, resource: threadId },
      }),
      signal: request.signal,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error');
      console.error('Mastra server error:', upstream.status, errorText);
      return new Response('Agent server error', { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error proxying to Mastra', error);
    return new Response('An error occurred while processing your request.', {
      status: 500,
    });
  }
}
```

#### 4. Remove runtime Mastra dependency from web (optional, do after verifying)

**File**: `packages/web/package.json`
**Changes**: After proxy works, we can evaluate removing `@wgenie/fusion-mastra` from dependencies. However, the type-only imports from `@wgenie/fusion-mastra/alpha-types` still need it at build time, so keep it for now. The heavy runtime deps (`@mastra/core`, `@mastra/libsql`, `pg`) will be tree-shaken since they're no longer imported in route handlers.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit` (type imports still resolve)
- [ ] Web builds: `cd packages/web && pnpm build` (with `NEXT_PUBLIC_APP_CONFIG=yo`)
- [ ] No runtime imports from `@wgenie/fusion-mastra/agents` remain: `grep -r "from '@wgenie/fusion-mastra/agents'" packages/web/src/`

#### Manual Verification:
- [ ] Start Mastra locally (`cd packages/mastra && pnpm dev`)
- [ ] Start Web locally (`cd packages/web && pnpm dev:yo`)
- [ ] Open a vault detail page → Alpha chat streams responses correctly
- [ ] Open YO Treasury → chat streams responses correctly
- [ ] Tool results (Transaction Proposal cards, balance displays) render correctly

**Implementation Note**: This is the riskiest phase — agent streaming must work through the proxy. Test thoroughly before proceeding.

---

## Phase 3: Web — Prepare for Vercel Deployment

### Overview
Configure Next.js and Vercel for monorepo deployment with workspace packages.

### Changes Required:

#### 1. Add `packageManager` to root package.json

**File**: `package.json` (monorepo root)
**Changes**: Add packageManager field for Corepack

```json
{
  "packageManager": "pnpm@10.6.1"
}
```

Verify the exact pnpm version with `pnpm --version` and use that.

#### 2. Update next.config.ts

**File**: `packages/web/next.config.ts`
**Changes**: Add transpilePackages for workspace TS packages and outputFileTracingRoot

```typescript
import path from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@wgenie/fusion-supabase-ponder',
    '@wgenie/fusion-mastra',
  ],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default nextConfig;
```

Notes:
- `@wgenie/fusion-supabase-ponder` exports raw `.ts` — needs transpilation
- `@wgenie/fusion-mastra` is only used for type imports but listing it avoids resolution issues
- `@wgenie/fusion-sdk` is NOT listed because it's pre-compiled to `dist/`
- `outputFileTracingRoot` tells Next.js to trace files from the monorepo root (needed for workspace deps)
- `__dirname` workaround needed because this is an ESM module (`type: "module"`)

#### 3. Add vercel.json for Web

**File**: `packages/web/vercel.json` (new file)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm --filter @wgenie/fusion-sdk build && cd packages/web && NEXT_PUBLIC_APP_CONFIG=yo next build",
  "framework": "nextjs"
}
```

Notes:
- SDK is built first as a pre-step
- `NEXT_PUBLIC_APP_CONFIG=yo` is set inline in the build command
- `framework: "nextjs"` tells Vercel to use Next.js runtime

#### 4. Update web .env.example with deployment notes

**File**: `packages/web/.env.example`
**Changes**: Add comments for Vercel deployment

Add at the top:
```
# =============================================================================
# Vercel Deployment Notes
# =============================================================================
# Set ENABLE_EXPERIMENTAL_COREPACK=1 in Vercel project env vars
# Set NEXT_PUBLIC_APP_CONFIG=yo in Vercel project env vars (or use buildCommand)
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd ../.. && pnpm --filter @wgenie/fusion-sdk build && cd packages/web && NEXT_PUBLIC_APP_CONFIG=yo next build` succeeds locally
- [ ] TypeScript compiles with updated next.config.ts

#### Manual Verification:
- [ ] App loads correctly after building with the new config
- [ ] No visual regressions in yo mode

---

## Phase 4: Create Turso Database + Deploy to Vercel

### Overview
Provision Turso database, create both Vercel projects, configure env vars, deploy.

### Prerequisites
- Vercel CLI: `pnpm add -g vercel` (or `npm i -g vercel`)
- Turso CLI: `brew install tursodatabase/tap/turso` (macOS)
- Vercel account logged in: `vercel login`
- Turso account: `turso auth signup` or `turso auth login`

### Steps:

#### 1. Create Turso database

```bash
turso db create wgenie-fusion-mastra
turso db show wgenie-fusion-mastra --url        # → TURSO_DATABASE_URL
turso db tokens create wgenie-fusion-mastra     # → TURSO_AUTH_TOKEN
```

Save both values — needed for Mastra env vars.

#### 2. Create Vercel project for Web

```bash
cd packages/web
vercel link
# Select: Create new project
# Project name: wgenie-fusion-web (or your preference)
# Root directory: packages/web (auto-detected)
```

Set environment variables in Vercel dashboard or CLI:
```bash
# Required env vars for web
vercel env add ENABLE_EXPERIMENTAL_COREPACK        # Value: 1
vercel env add NEXT_PUBLIC_APP_CONFIG              # Value: yo
vercel env add PONDER_DB_SUPABASE_URL              # Value: https://<project-ref>.supabase.co
vercel env add PONDER_DB_SUPABASE_SERVICE_ROLE_KEY # Value: eyJ...
vercel env add NEXT_PUBLIC_SUPABASE_URL            # Value: https://<project-ref>.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY # Value: eyJ...
vercel env add RPC_URL_MAINNET                     # Value: https://eth-mainnet.g.alchemy.com/v2/...
vercel env add RPC_URL_BASE                        # Value: https://base-mainnet.g.alchemy.com/v2/...
vercel env add RPC_URL_ARBITRUM                    # Value: https://arb-mainnet.g.alchemy.com/v2/...
vercel env add NEXT_PUBLIC_RPC_URL_MAINNET         # Value: (same or public RPC)
vercel env add NEXT_PUBLIC_RPC_URL_BASE            # Value: (same or public RPC)
vercel env add NEXT_PUBLIC_RPC_URL_ARBITRUM        # Value: (same or public RPC)
vercel env add NEXT_PUBLIC_YO_PARTNER_ID           # Value: 9999 (or real ID)
vercel env add MASTRA_SERVER_URL                   # Value: https://<mastra-project>.vercel.app
```

Note: `MASTRA_SERVER_URL` can be set after Mastra project is created (use the Vercel-assigned URL).

#### 3. Create Vercel project for Mastra

```bash
cd packages/mastra
vercel link
# Select: Create new project
# Project name: wgenie-fusion-mastra (or your preference)
# Root directory: packages/mastra
```

Set environment variables:
```bash
vercel env add ENABLE_EXPERIMENTAL_COREPACK  # Value: 1
vercel env add OPENROUTER_API_KEY            # Value: sk-or-v1-...
vercel env add MODEL                         # Value: openrouter/anthropic/claude-3-5-haiku-20241022
vercel env add TURSO_DATABASE_URL            # Value: libsql://wgenie-fusion-mastra.turso.io
vercel env add TURSO_AUTH_TOKEN              # Value: (from step 1)
vercel env add BASE_RPC_URL                  # Value: https://base-mainnet.g.alchemy.com/v2/...
vercel env add ETHEREUM_RPC_URL              # Value: https://eth-mainnet.g.alchemy.com/v2/...
vercel env add ARBITRUM_RPC_URL              # Value: https://arb-mainnet.g.alchemy.com/v2/...
```

#### 4. Verify Vercel dashboard settings for both projects

For each project, check in Settings → Build & Development:
- **"Include source files outside of the Root Directory"**: Must be ON (should be default)
- Root Directory is set correctly

#### 5. Deploy Mastra first

```bash
cd packages/mastra
vercel --prod
```

Note the deployment URL. Update the web project's `MASTRA_SERVER_URL` env var with it.

#### 6. Deploy Web

```bash
cd packages/web
vercel --prod
```

### Success Criteria:

#### Automated Verification:
- [ ] `vercel --prod` succeeds for both projects (no build errors)
- [ ] `curl https://<mastra-url>/api/agents` returns JSON with agent list
- [ ] `curl https://<web-url>` returns HTML

#### Manual Verification:
- [ ] Web app loads at the Vercel URL, shows YO config
- [ ] Vault list populates from remote Supabase
- [ ] Agent chat in vault detail works end-to-end (streaming, tool calls, tool result rendering)
- [ ] YO Treasury chat works end-to-end

**Implementation Note**: Deploy Mastra first so you have the URL for the web project's `MASTRA_SERVER_URL`. If something fails, check Vercel build logs (accessible via dashboard or `vercel logs`).

---

## Phase 5: Verification & Hardening

### Overview
Full end-to-end testing and any fixups needed.

### Checks:

#### Web App
- [ ] Home page loads, vault list from Supabase renders
- [ ] Vault detail page loads with metrics and charts
- [ ] Flow chart data loads (API route → Supabase)
- [ ] Activity page loads
- [ ] Depositors page loads
- [ ] Alpha chat: send a message, get streaming response with tool calls
- [ ] YO Treasury chat: send a message, get streaming response
- [ ] Tool result UI components render (Transaction Proposal cards, balance snapshots)
- [ ] Wallet connect works (WalletConnect / injected)

#### Mastra Server
- [ ] `/api/agents` returns agent list
- [ ] Agents respond to chat messages
- [ ] Working memory persists between messages (Turso storage)
- [ ] Tool calls execute (RPC calls, Odos API, etc.)

#### Known Risks
- **Vercel function timeout**: Hobby plan = 60s max. Agent flows with multiple tool calls + LLM round-trips can exceed this. If timeout issues occur, consider upgrading to Pro (800s max) or reducing `maxSteps`.
- **Cold start**: First request after idle period may be slow. Turso connection setup adds latency.
- **CORS**: Mastra server has `cors: { origin: '*' }` — fine for now, tighten later.
- **Stream buffering**: If streaming doesn't work, verify `X-Accel-Buffering: no` header is being sent and not stripped by Vercel's edge.

---

## Testing Strategy

### Integration Tests (manual):
1. Deploy Mastra → verify `/api/agents` endpoint
2. Deploy Web → verify pages load
3. Open vault detail → chat with Alpha Agent
4. Open YO Treasury → chat with YO Agent
5. Verify tool results render in chat UI
6. Verify working memory persists (ask follow-up questions)

### Rollback Plan:
- Both Vercel projects have instant rollback to previous deployment via dashboard
- Local development is unaffected (Mastra falls back to `file:./mastra.db`, Web falls back to `MASTRA_SERVER_URL=http://localhost:4111`)

---

## Environment Variables Summary

### Web (Vercel)
| Variable | Value | Scope |
|---|---|---|
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | All |
| `NEXT_PUBLIC_APP_CONFIG` | `yo` | All |
| `PONDER_DB_SUPABASE_URL` | `https://<ref>.supabase.co` | Server |
| `PONDER_DB_SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Server |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Client |
| `RPC_URL_MAINNET` | Alchemy URL | Server |
| `RPC_URL_BASE` | Alchemy URL | Server |
| `RPC_URL_ARBITRUM` | Alchemy URL | Server |
| `NEXT_PUBLIC_RPC_URL_MAINNET` | Alchemy URL | Client |
| `NEXT_PUBLIC_RPC_URL_BASE` | Alchemy URL | Client |
| `NEXT_PUBLIC_RPC_URL_ARBITRUM` | Alchemy URL | Client |
| `NEXT_PUBLIC_YO_PARTNER_ID` | `9999` | Client |
| `MASTRA_SERVER_URL` | `https://<mastra>.vercel.app` | Server |

### Mastra (Vercel)
| Variable | Value | Scope |
|---|---|---|
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | All |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Server |
| `MODEL` | `openrouter/anthropic/claude-3-5-haiku-20241022` | Server |
| `TURSO_DATABASE_URL` | `libsql://wgenie-fusion-mastra.turso.io` | Server |
| `TURSO_AUTH_TOKEN` | Turso token | Server |
| `BASE_RPC_URL` | Alchemy URL | Server |
| `ETHEREUM_RPC_URL` | Alchemy URL | Server |
| `ARBITRUM_RPC_URL` | Alchemy URL | Server |

---

## References

- Ticket: `thoughts/kuba/tickets/fsn_0085-deploy-to-vercel.md`
- [Mastra Deploy to Vercel](https://mastra.ai/guides/deployment/vercel)
- [VercelDeployer Reference](https://mastra.ai/reference/deployer/vercel)
- [Mastra LibSQL Storage](https://mastra.ai/reference/storage/libsql)
- [Vercel Monorepos](https://vercel.com/docs/monorepos)
- [Vercel pnpm Support](https://vercel.com/docs/package-managers)
- [Next.js transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [Turso + Vercel Marketplace](https://vercel.com/marketplace/tursocloud)
