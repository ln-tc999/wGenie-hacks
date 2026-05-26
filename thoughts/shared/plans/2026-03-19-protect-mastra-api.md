# Protect Mastra API with API Key Authentication

## Overview

The Mastra API deployed on Vercel is currently unprotected (`cors: origin: '*'`, no auth). Anyone can call it directly and burn OpenRouter credits. We need to add API key authentication so only the Next.js web app can call the Mastra API.

## Current State Analysis

- **Mastra server**: `packages/mastra/src/mastra/index.ts` — CORS wide open (`origin: '*'`)
- **Next.js proxy routes** (server-side only, API key stays secret):
  - `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts` → `fetch(MASTRA_URL/chat/alphaAgent)`
  - `packages/web/src/app/api/yo/treasury/chat/route.ts` → `fetch(MASTRA_URL/chat/yoTreasuryAgent)`
- Both proxy routes use `MASTRA_SERVER_URL` env var
- Browser never calls Mastra directly — always through Next.js Route Handlers

### Key Discoveries:
- `server.middleware` accepts Hono `MiddlewareHandler` — see `packages/mastra/node_modules/@mastra/core/dist/server/types.d.ts:148`
- Middleware runs before route handlers in the Hono chain
- Env vars are validated with Zod in `packages/mastra/src/env.ts`

## Desired End State

- All `/chat/*` and `/api/*` routes on the Mastra API require a valid `X-API-Key` header
- `/health` endpoint remains public (for monitoring)
- The Next.js web app sends the API key from a server-side env var
- CORS is restricted to the web app's domain as defense-in-depth
- Unauthorized requests get a `401 Unauthorized` response

### How to verify:
- `curl https://mastra-url/chat/alphaAgent` → 401
- `curl -H "X-API-Key: wrong" https://mastra-url/chat/alphaAgent` → 401
- Next.js proxy routes work normally with the correct key

## What We're NOT Doing

- No user-level auth (JWT, sessions, etc.) — this is service-to-service API key
- No rate limiting (can add later)
- No per-agent keys — single shared key for all routes

## Implementation Approach

Single shared API key (`MASTRA_API_KEY`) validated via Hono middleware on the Mastra server, sent by Next.js proxy routes.

## Phase 1: Add API Key Middleware to Mastra Server

### Changes Required:

#### 1. Add `MASTRA_API_KEY` to env schema

**File**: `packages/mastra/src/env.ts`

Add to the Zod schema:
```ts
MASTRA_API_KEY: z.string().min(1, 'MASTRA_API_KEY is required for API protection'),
```

#### 2. Add middleware + restrict CORS

**File**: `packages/mastra/src/mastra/index.ts`

Add a Hono middleware handler that:
- Skips `/health` requests
- Checks `X-API-Key` header against `process.env.MASTRA_API_KEY`
- Returns 401 if missing or wrong

Change CORS origin from `'*'` to `'https://fusion-monorepo-web.vercel.app'`.

```ts
import { createMiddleware } from 'hono/factory';

const apiKeyMiddleware = createMiddleware(async (c, next) => {
  // Allow health checks without auth
  if (c.req.path === '/health') {
    return next();
  }

  const apiKey = c.req.header('X-API-Key');
  if (!apiKey || apiKey !== process.env.MASTRA_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
});
```

Then add to server config:
```ts
server: {
  middleware: [apiKeyMiddleware],
  cors: {
    origin: 'https://fusion-monorepo-web.vercel.app',
    allowMethods: ['*'],
    allowHeaders: ['Content-Type', 'X-API-Key'],
  },
  // ...
},
```

#### 3. Add env var to `.env.example`

**File**: `packages/mastra/.env.example`

```
MASTRA_API_KEY=your-secret-api-key-here
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] Env schema validates with the new var set

#### Manual Verification:
- [ ] Set `MASTRA_API_KEY` in Vercel env vars for the Mastra project
- [ ] Redeploy Mastra
- [ ] Direct curl without key returns 401
- [ ] `/health` still returns 200 without key

---

## Phase 2: Send API Key from Next.js Proxy Routes

### Changes Required:

#### 1. Both proxy routes — add `X-API-Key` header

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
**File**: `packages/web/src/app/api/yo/treasury/chat/route.ts`

In the `fetch()` call, add the header:
```ts
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.MASTRA_API_KEY ?? '',
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Set `MASTRA_API_KEY` in Vercel env vars for the web project (same value as Mastra project)
- [ ] Redeploy web app
- [ ] Chat with Alpha Agent works end-to-end
- [ ] Chat with YO Treasury Agent works end-to-end

---

## Deployment Steps

1. Generate a strong API key: `openssl rand -hex 32`
2. Add `MASTRA_API_KEY=<generated-key>` to **both** Vercel projects (mastra + web)
3. Deploy Mastra first (so it starts requiring the key)
4. Deploy web immediately after (so it starts sending the key)

**Note**: There will be a brief window between deploys where the web app doesn't send the key yet. To avoid downtime, deploy web first (sending a key that's ignored), then deploy Mastra (which starts requiring it).

## References

- Mastra server config: `packages/mastra/src/mastra/index.ts`
- Mastra server types: `packages/mastra/node_modules/@mastra/core/dist/server/types.d.ts`
- Web proxy routes: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`, `packages/web/src/app/api/yo/treasury/chat/route.ts`
