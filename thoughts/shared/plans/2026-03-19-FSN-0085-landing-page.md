# YO Treasury Landing Page — Implementation Plan

## Overview

Replace the YO dashboard at `/` with a brand-consistent, full-screen landing page. Remove the auth gate entirely for the YO app config so unauthenticated visitors see the landing page immediately.

## Current State Analysis

- Root `/` for yo config renders `<YoDashboard />` inside `<SidebarLayout>` — `src/app/(dashboard)/page.tsx:14`
- Middleware at `src/lib/supabase/middleware.ts:33-41` redirects all unauthenticated non-`/login` requests to `/login`
- `(dashboard)/layout.tsx` unconditionally wraps children in `<SidebarLayout>`
- `<YoDashboard />` at `src/yo-treasury/components/yo-dashboard.tsx` renders `<YoTreasuryOverview>` — same content already available on the vault detail page at `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`

### Key Discoveries

- `yo-dashboard.tsx` is only imported in `(dashboard)/page.tsx:9` — safe to delete
- `(dashboard)/layout.tsx` is a client component using `usePathname()` — can conditionally skip sidebar
- `getAppConfig()` reads `NEXT_PUBLIC_APP_CONFIG` env var — available both server and client side
- YO brand tokens already defined in `global.css:219-266`: `bg-yo-neon`, `bg-yo-black`, `bg-yo-dark`, `text-yo-muted`, `font-yo`
- Logo at `/assets/yo/yo_no_bg.svg` (neon green on transparent)

## Desired End State

- Visiting `/` shows a full-screen landing page (no sidebar, no auth required)
- Primary CTA "Open App" links to `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`
- Secondary CTA "Create YO Treasury" links to `/yo-treasury/create`
- YO design aesthetic: `#000` bg, `#D6FF34` neon accent, Space Grotesk, atmospheric effects
- No auth gate for any route when `NEXT_PUBLIC_APP_CONFIG=yo`
- `<YoDashboard />` component removed

### Verification

- Unauthenticated user at `/` sees landing page (no redirect to `/login`)
- "Open App" navigates to vault page
- "Create YO Treasury" navigates to wizard
- Other yo pages (`/vaults`, `/vaults/8453/...`, `/yo-treasury/create`) still work with sidebar
- Non-yo configs are unaffected (auth gate still active)

## What We're NOT Doing

- Changing the login flow for non-yo configs
- Removing the `/login` page (still used by non-yo configs, and yo users may still see it as a fallback)
- Adding animations via framer-motion (keep initial version CSS-only; can enhance later)
- Responsive mobile nav on the landing page (just CTAs for now)

## Implementation Approach

Two phases: (1) disable auth for yo, (2) create landing page and rewire routing.

---

## Phase 1: Disable Auth Gate for YO App

### Overview

Skip the Supabase auth middleware entirely when `NEXT_PUBLIC_APP_CONFIG=yo`. All routes become public.

### Changes Required

#### 1. Update Supabase middleware

**File**: `packages/web/src/lib/supabase/middleware.ts`
**Changes**: Early return when yo config — skip auth check entirely

```typescript
export async function updateSession(request: NextRequest) {
  // YO app is fully public — no auth gate
  if (process.env.NEXT_PUBLIC_APP_CONFIG === 'yo') {
    return NextResponse.next({ request });
  }

  // ... rest of existing auth logic unchanged ...
}
```

### Success Criteria

#### Automated Verification
- [ ] `cd packages/web && npx tsc --noEmit` passes
- [ ] `NEXT_PUBLIC_APP_CONFIG=yo pnpm --filter @wgenie/fusion-web build` succeeds

#### Manual Verification
- [ ] With `NEXT_PUBLIC_APP_CONFIG=yo`: visiting any page in a fresh incognito browser does NOT redirect to `/login`
- [ ] With `NEXT_PUBLIC_APP_CONFIG=all` or `fusion`: visiting any page while logged out STILL redirects to `/login`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Create Landing Page & Rewire Routing

### Overview

Create a full-screen YO landing page component, update the dashboard layout to skip the sidebar for yo at `/`, and remove the old YoDashboard.

### Changes Required

#### 1. Create landing page component

**File**: `packages/web/src/yo-treasury/components/yo-landing-page.tsx` (new file)

A `'use client'` component. Full-screen layout with:

- `min-h-screen bg-yo-black` base
- Centered content area with:
  - YO logo (`/assets/yo/yo_no_bg.svg`) — large, with subtle neon glow
  - Headline: "YO Treasury" — large, Space Grotesk, white
  - Subheadline describing YO Treasury — `text-yo-muted`
  - Primary CTA button: "Open App" → `<Link href="/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D">` — `bg-yo-neon text-black font-semibold`
  - Secondary CTA: "Create YO Treasury" → `<Link href="/yo-treasury/create">` — bordered/ghost style, `border-yo-neon/30 text-yo-neon`
- Atmospheric effects: subtle neon glow behind logo, fine grain texture overlay
- No sidebar, no nav bar — fully self-contained

Design reference: follow `yo-design` skill guidelines — dark, clean, electric. Asymmetric hero, generous whitespace, card-based CTAs optional.

```tsx
'use client';

import Link from 'next/link';

const VAULT_URL = '/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D';
const CREATE_URL = '/yo-treasury/create';

export function YoLandingPage() {
  return (
    <div className="min-h-screen bg-yo-black flex flex-col items-center justify-center font-yo relative overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yo-neon/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-2xl">
        {/* Logo */}
        <img
          src="/assets/yo/yo_no_bg.svg"
          alt="YO"
          className="h-20 w-auto drop-shadow-[0_0_40px_rgba(214,255,52,0.3)]"
        />

        {/* Headlines */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">
            YO Treasury
          </h1>
          <p className="text-lg md:text-xl text-yo-muted max-w-md mx-auto leading-relaxed">
            AI-powered treasury management for onchain yield. Deposit, allocate,
            and optimize across DeFi — all from one vault.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href={VAULT_URL}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-yo-neon text-black font-semibold text-base hover:bg-yo-neon/90 transition-colors"
          >
            Open App
          </Link>
          <Link
            href={CREATE_URL}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-yo-neon/30 text-yo-neon font-medium text-base hover:bg-yo-neon/10 transition-colors"
          >
            Create YO Treasury
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Update dashboard layout to skip sidebar for yo landing

**File**: `packages/web/src/app/(dashboard)/layout.tsx`
**Changes**: Conditionally render without `<SidebarLayout>` when yo config at `/`

```typescript
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';
import { getAppConfig } from '@/lib/app-config';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const config = getAppConfig();

  // Landing page renders full-screen without sidebar
  if (config.id === 'yo' && pathname === '/') {
    return <>{children}</>;
  }

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
```

#### 3. Update dashboard page to render landing page for yo

**File**: `packages/web/src/app/(dashboard)/page.tsx`
**Changes**: Replace `<YoDashboard />` with `<YoLandingPage />`

```typescript
import { getAppConfig } from '@/lib/app-config';
import { fetchDashboardMetrics } from '@/dashboard/fetch-dashboard-metrics';
import { fetchDashboardRankings } from '@/dashboard/fetch-dashboard-rankings';
import { DashboardMetrics } from '@/dashboard/components/dashboard-metrics';
import { DashboardFlowChart } from '@/dashboard/dashboard-flow-chart';
import { DashboardVaultRankings } from '@/dashboard/components/dashboard-vault-rankings';
import { DashboardLargestTransactions } from '@/dashboard/components/dashboard-largest-transactions';
import { DashboardTopDepositors } from '@/dashboard/components/dashboard-top-depositors';
import { YoLandingPage } from '@/yo-treasury/components/yo-landing-page';

export default async function DashboardPage() {
  const config = getAppConfig();

  if (config.id === 'yo') {
    return <YoLandingPage />;
  }

  const [metrics, rankings] = await Promise.all([
    fetchDashboardMetrics(),
    fetchDashboardRankings(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ... existing dashboard unchanged ... */}
    </div>
  );
}
```

#### 4. Delete YoDashboard component

**File**: `packages/web/src/yo-treasury/components/yo-dashboard.tsx`
**Action**: Delete this file entirely.

#### 5. Update yo nav items (optional cleanup)

**File**: `packages/web/src/lib/app-config.ts`
**Changes**: Rename "Dashboard" nav item to "Home" for yo config since it's now a landing page, not a dashboard.

```typescript
const yoConfig: AppConfig = {
  // ... unchanged ...
  navItems: [
    { title: 'Home', url: '/', icon: Home },
    // ... rest unchanged ...
  ],
  // ...
};
```

### Success Criteria

#### Automated Verification
- [ ] `cd packages/web && npx tsc --noEmit` passes
- [ ] `NEXT_PUBLIC_APP_CONFIG=yo pnpm --filter @wgenie/fusion-web build` succeeds
- [ ] No imports of `yo-dashboard` remain: `grep -r "yo-dashboard" packages/web/src/`
- [ ] `yo-dashboard.tsx` file does not exist

#### Manual Verification
- [ ] Visiting `/` with yo config shows full-screen landing page (no sidebar)
- [ ] "Open App" button navigates to vault detail page
- [ ] "Create YO Treasury" button navigates to wizard
- [ ] Visiting `/vaults` or any other page still shows sidebar
- [ ] Non-yo configs still show the standard dashboard at `/`
- [ ] Landing page looks correct: black bg, neon green accent, Space Grotesk, centered layout

**Implementation Note**: The landing page design in this plan is a starting point. After verifying it works, we can iterate on the visual design (add more sections, refine copy, enhance atmospheric effects) based on feedback.

---

## Testing Strategy

### Integration (manual)
1. Fresh incognito browser → visit `/` with yo config → see landing page
2. Click "Open App" → navigate to vault page (may see login if auth is needed for that page — but auth is now disabled for yo)
3. Click "Create YO Treasury" → navigate to wizard
4. Visit `/vaults` → see vault list with sidebar
5. Switch to `NEXT_PUBLIC_APP_CONFIG=all` → visit `/` → see standard dashboard with auth gate

### Rollback
- Revert the 4 changed files + delete the new component
- Re-add `yo-dashboard.tsx` from git

---

## References

- Ticket: `thoughts/kuba/tickets/fsn_0085-landing-page-instead-dashboard.md`
- Deployment plan: `thoughts/shared/plans/2026-03-19-FSN-0085-deploy-to-vercel.md`
- YO design skill: `.claude/skills/yo-design/SKILL.md`
- App config: `packages/web/src/lib/app-config.ts`
- Auth middleware: `packages/web/src/lib/supabase/middleware.ts`
- Dashboard layout: `packages/web/src/app/(dashboard)/layout.tsx`
- Dashboard page: `packages/web/src/app/(dashboard)/page.tsx`
