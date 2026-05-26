# FSN-0030: Allow Playwright MCP to Access SIWE-Protected Pages

## Overview

Create a development-only API route (`/api/auth/dev-login`) that authenticates a headless browser (Playwright MCP) by programmatically signing a SIWE message server-side using viem's local account, then calling Supabase's `signInWithWeb3`. This creates a real session with cookies, allowing Playwright to browse the app as an authenticated user.

## Current State Analysis

- **SIWE auth flow**: Client connects wallet (wagmi/injected) → creates SIWE message → wallet signs → POST to `/api/auth/siwe` → whitelist check → `signInWithWeb3` → session cookies set
- **Middleware**: `packages/web/src/middleware.ts` redirects all unauthenticated requests to `/login` (except `/login` and `/api/auth/*` paths)
- **Whitelist**: Hardcoded `Set<string>` in `packages/web/src/app/api/auth/siwe/route.ts:5-7` with one address
- **Session**: HTTP-only cookies managed by `@supabase/ssr`, checked via `supabase.auth.getUser()` in middleware
- **Playwright MCP**: Configured in `.mcp.json`, runs `@playwright/mcp@latest` — provides browser automation tools but cannot interact with MetaMask or sign Ethereum messages

### Key Discoveries:

- `signInWithWeb3` does pure cryptographic ECDSA verification — no blockchain connection needed (`packages/web/src/app/api/auth/siwe/route.ts:112-116`)
- viem's `privateKeyToAccount` can sign messages identical to MetaMask — same cryptographic output
- The middleware already exempts `/api/auth` paths (`packages/web/src/lib/supabase/middleware.ts:36`), so a new route under `/api/auth/` won't be blocked
- The `createSupabaseServerClient()` sets cookies via Next.js `cookies()` API (`packages/web/src/lib/supabase/server.ts:16-19`)

## Desired End State

Playwright MCP can authenticate by navigating to `http://localhost:3000/api/auth/dev-login`. After the redirect to `/`, the browser has valid Supabase session cookies and can access all protected pages. This only works when `NODE_ENV === 'development'`.

### Verification:

1. Start dev server: `pnpm --filter web dev`
2. Use Playwright MCP `browser_navigate` to `http://localhost:3000/api/auth/dev-login`
3. Confirm redirect to `http://localhost:3000/` (dashboard)
4. Use `browser_snapshot` to confirm dashboard content is visible (not the login page)

## What We're NOT Doing

- Not modifying the production SIWE auth flow
- Not adding the dev address to the production whitelist
- Not installing new dependencies (viem is already available)
- Not creating Playwright test files or test infrastructure
- Not changing the middleware logic
- Not persisting browser state to disk

## Implementation Approach

Create a single new file: a GET route handler at `/api/auth/dev-login`. It:
1. Guards with `NODE_ENV` check (returns 403 in non-development)
2. Creates a local Ethereum account from Hardhat's well-known account 0 private key
3. Creates a SIWE message with `createSiweMessage` from `viem/siwe`
4. Signs it locally with `account.signMessage`
5. Calls `signInWithWeb3` on the Supabase server client (sets session cookies)
6. Redirects to `/`

This is entirely self-contained — it does not touch the existing SIWE route or whitelist. The dev account address never appears in the whitelist because the dev-login route calls `signInWithWeb3` directly (the whitelist is only checked in `/api/auth/siwe`).

## Phase 1: Create Dev Login Route

### Overview

Single file addition. No existing files modified.

### Changes Required:

#### 1. New Route Handler

**File**: `packages/web/src/app/api/auth/dev-login/route.ts` (new)

```typescript
import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Hardhat account 0 — well-known test private key, NEVER use with real funds
const DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Dev login is only available in development mode.' },
      { status: 403 }
    );
  }

  const account = privateKeyToAccount(DEV_PRIVATE_KEY);

  const message = createSiweMessage({
    domain: 'localhost:3000',
    address: account.address,
    statement: 'Sign in to Fusion by wGenie (dev mode)',
    uri: 'http://localhost:3000',
    version: '1',
    chainId: 1,
    nonce: generateSiweNonce(),
  });

  const signature = await account.signMessage({ message });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithWeb3({
    chain: 'ethereum',
    message,
    signature: signature as `0x${string}`,
  });

  if (error) {
    return NextResponse.json(
      { error: `Dev login failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL('/', 'http://localhost:3000'));
}
```

**Key design decisions:**
- **GET handler** — so Playwright can authenticate by just navigating to the URL (no POST body needed)
- **Hardhat account 0** — well-known test key, address `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. This is the industry-standard test key and carries no security risk.
- **Hardcoded domain/uri** — `localhost:3000` matches the dev server. If Supabase validates domain/URI, this ensures it passes.
- **Redirect on success** — returns `302` to `/` so the browser lands on the dashboard with cookies already set
- **No whitelist involvement** — this route calls `signInWithWeb3` directly, never passes through the `/api/auth/siwe` route

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] Linting passes: `pnpm --filter web lint`
- [ ] Dev server starts without errors: `pnpm --filter web dev`

#### Manual Verification:

- [ ] Navigate to `http://localhost:3000/api/auth/dev-login` in a browser — redirects to dashboard
- [ ] Use Playwright MCP `browser_navigate` to `http://localhost:3000/api/auth/dev-login`
- [ ] After redirect, `browser_snapshot` shows dashboard content (not login page)
- [ ] Normal SIWE login flow still works independently
- [ ] In production build (`NODE_ENV=production`), the route returns 403

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Manual Testing Steps:

1. Start dev server (`pnpm --filter web dev`)
2. Open Playwright MCP browser, navigate to `http://localhost:3000/api/auth/dev-login`
3. Confirm redirect to `/` with dashboard visible
4. Navigate to other protected pages (e.g., `/vaults`, `/depositors`) — should work
5. Open a fresh incognito browser, visit `http://localhost:3000` — should still redirect to `/login` (dev-login only affects the session that hits the route)

## Performance Considerations

None — this is a development-only feature that creates one ECDSA signature (< 1ms) and one Supabase auth call per invocation.

## Security Considerations

- **`NODE_ENV` guard**: Route returns 403 unless `NODE_ENV === 'development'`. Next.js production builds set this to `'production'` automatically.
- **Well-known test key**: Hardhat account 0 is universally known — the private key is in every Hardhat tutorial. It must never hold real funds. Using it here is safe because it only creates a dev session.
- **No whitelist pollution**: The dev address is NOT added to the production whitelist.
- **Route not tree-shaken**: The file will exist in production builds but the `NODE_ENV` check prevents execution. For extra safety, the route could be excluded via Next.js config, but the guard is sufficient.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0030-auth-with-web3-playwright.md`
- SIWE login plan: `thoughts/shared/plans/2026-02-07-FSN-0026-siwe-login.md`
- SIWE route: `packages/web/src/app/api/auth/siwe/route.ts`
- Supabase server client: `packages/web/src/lib/supabase/server.ts`
- Middleware: `packages/web/src/lib/supabase/middleware.ts`
- viem docs: `privateKeyToAccount`, `createSiweMessage`, `generateSiweNonce`
- Hardhat default accounts: https://hardhat.org/hardhat-network/docs/reference#initial-state
