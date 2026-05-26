# Sidebar Navigation Implementation Plan

## Overview

Introduce a collapsible sidebar for top-level routing using shadcn's sidebar-07 variant (collapses to icons). The sidebar will provide navigation for Home, Vault Directory, and Activity (placeholder). On mobile, a bottom navigation bar replaces the sidebar.

## Current State Analysis

- **Framework**: Astro with React islands (`client:load`)
- **Layout**: Single `Layout.astro` with no global navigation
- **Pages**:
  - `/` → redirects to `/vaults`
  - `/vaults` → Vault directory listing
  - `/vaults/[chainId]/[address]/[...tab]` → Vault details with tabs
- **Navigation**: Only breadcrumbs in vault details, no persistent nav
- **shadcn**: Configured with `new-york` style, ~25 UI components installed

### Key Discoveries:
- Sidebar component requires: `@radix-ui/react-slot`, `class-variance-authority`, `lucide-react` (already installed)
- Missing dependencies: `@radix-ui/react-collapsible`, `@radix-ui/react-separator`
- App branding: "DeFi Panda" with `favicon.png` logo
- Routing uses `window.location.href` (full page reloads, not SPA)

## Desired End State

After implementation:
1. Desktop: Collapsible sidebar on the left with Home, Vault Directory, Activity navigation
2. Mobile: Bottom navigation bar with the same items
3. Sidebar collapses to icon-only mode, persists state
4. All existing functionality (vault list, vault details, tabs) continues to work
5. Clean, consistent navigation experience across all pages

### Verification:
- Sidebar appears on desktop viewports (≥768px)
- Bottom nav appears on mobile viewports (<768px)
- Navigation items work correctly
- Sidebar collapse/expand works with icon tooltips
- Vault detail tabs remain functional

## What We're NOT Doing

- User authentication/profile in sidebar (future feature)
- Team/workspace switcher
- Collapsible sub-menus (navigation is flat for now)
- Changing the vault detail tabs to sidebar secondary nav
- Dark/light mode toggle (already dark mode only)

## Implementation Approach

1. Install shadcn sidebar and dependencies via CLI
2. Create simplified sidebar components (no team switcher, no user menu)
3. Create custom bottom nav for mobile
4. Create a React SidebarLayout wrapper component
5. Integrate into Astro Layout
6. Test with Playwright

---

## Phase 1: Install Sidebar Dependencies & Components

### Overview
Install the shadcn sidebar component and required dependencies.

### Changes Required:

#### 1. Install shadcn sidebar component
**Command**:
```bash
cd packages/web && npx shadcn@latest add sidebar
```

This will install:
- `@/components/ui/sidebar.tsx` - Core sidebar primitives
- Required Radix dependencies (collapsible, etc.)

#### 2. Install additional required components
**Command**:
```bash
cd packages/web && npx shadcn@latest add separator breadcrumb collapsible
```

#### 3. Verify dependencies in package.json
After installation, ensure these are present:
- `@radix-ui/react-collapsible`
- `@radix-ui/react-separator`

### Success Criteria:

#### Automated Verification:
- [ ] Sidebar component exists: `ls packages/web/src/components/ui/sidebar.tsx`
- [ ] Separator component exists: `ls packages/web/src/components/ui/separator.tsx`
- [ ] Breadcrumb component exists: `ls packages/web/src/components/ui/breadcrumb.tsx`
- [ ] Collapsible component exists: `ls packages/web/src/components/ui/collapsible.tsx`
- [ ] Build passes: `cd packages/web && npm run build`
- [ ] Lint passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] No TypeScript errors in IDE

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 2: Create Simplified AppSidebar Component

### Overview
Create a simplified sidebar with just the navigation items we need (Home, Vault Directory, Activity).

### Changes Required:

#### 1. Create navigation config
**File**: `packages/web/src/components/sidebar/nav-config.ts`

```typescript
import { Home, Vault, Activity, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
}

export const navItems: NavItem[] = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Vault Directory',
    url: '/vaults',
    icon: Vault,
  },
  {
    title: 'Activity',
    url: '/activity',
    icon: Activity,
  },
];

export function getActiveNavItem(pathname: string): string | undefined {
  // Exact match first
  const exact = navItems.find((item) => item.url === pathname);
  if (exact) return exact.url;

  // Prefix match for nested routes (e.g., /vaults/123 matches /vaults)
  const prefix = navItems.find(
    (item) => item.url !== '/' && pathname.startsWith(item.url)
  );
  return prefix?.url;
}
```

#### 2. Create NavMain component
**File**: `packages/web/src/components/sidebar/nav-main.tsx`

```tsx
import { type LucideIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
  activeUrl?: string;
}

export function NavMain({ items, activeUrl }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.url === activeUrl;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
              >
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

#### 3. Create AppSidebar component
**File**: `packages/web/src/components/sidebar/app-sidebar.tsx`

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavMain } from './nav-main';
import { navItems, getActiveNavItem } from './nav-config';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  pathname: string;
}

export function AppSidebar({ pathname, ...props }: AppSidebarProps) {
  const activeUrl = getActiveNavItem(pathname);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img
            src="/favicon.png"
            alt="DeFi Panda"
            className="h-8 w-8 rounded-lg"
          />
          <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            DeFi Panda
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} activeUrl={activeUrl} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
```

#### 4. Create index export
**File**: `packages/web/src/components/sidebar/index.ts`

```typescript
export { AppSidebar } from './app-sidebar';
export { NavMain } from './nav-main';
export { navItems, getActiveNavItem } from './nav-config';
export type { NavItem } from './nav-config';
```

### Success Criteria:

#### Automated Verification:
- [ ] Files exist: `ls packages/web/src/components/sidebar/`
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Lint passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] No TypeScript errors in IDE for new files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 3: Create BottomNav for Mobile

### Overview
Create a custom bottom navigation component that appears only on mobile devices.

### Changes Required:

#### 1. Create BottomNav component
**File**: `packages/web/src/components/sidebar/bottom-nav.tsx`

```tsx
import { navItems, getActiveNavItem } from './nav-config';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  pathname: string;
}

export function BottomNav({ pathname }: BottomNavProps) {
  const activeUrl = getActiveNavItem(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.url === activeUrl;
          return (
            <a
              key={item.title}
              href={item.url}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
```

#### 2. Update index export
**File**: `packages/web/src/components/sidebar/index.ts`

Add export:
```typescript
export { BottomNav } from './bottom-nav';
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `ls packages/web/src/components/sidebar/bottom-nav.tsx`
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Lint passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] No TypeScript errors in IDE

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 4: Create SidebarLayout Component

### Overview
Create a React component that provides the sidebar layout wrapper for Astro pages.

### Changes Required:

#### 1. Create SidebarLayout component
**File**: `packages/web/src/components/sidebar/sidebar-layout.tsx`

```tsx
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';

interface SidebarLayoutProps {
  children: React.ReactNode;
  pathname: string;
}

export function SidebarLayout({ children, pathname }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar pathname={pathname} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:h-16">
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden h-4 md:block"
          />
          <span className="font-semibold md:hidden">DeFi Panda</span>
        </header>
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </SidebarInset>
      <BottomNav pathname={pathname} />
    </SidebarProvider>
  );
}
```

#### 2. Update index export
**File**: `packages/web/src/components/sidebar/index.ts`

Add export:
```typescript
export { SidebarLayout } from './sidebar-layout';
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `ls packages/web/src/components/sidebar/sidebar-layout.tsx`
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Lint passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] No TypeScript errors in IDE

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 5: Update Astro Layout and Pages

### Overview
Integrate the SidebarLayout into Astro pages.

### Changes Required:

#### 1. Update Layout.astro
**File**: `packages/web/src/layouts/Layout.astro`

```astro
---
import '../styles/global.css';

interface Props {
  title?: string;
}

const { title = 'Defi Panda' } = Astro.props;
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style>
  html,
  body {
    margin: 0;
    width: 100%;
    height: 100%;
  }
</style>
```

(No changes needed - Layout.astro remains a basic HTML wrapper)

#### 2. Create SidebarLayout Astro wrapper
**File**: `packages/web/src/layouts/SidebarLayout.astro`

```astro
---
import Layout from './Layout.astro';
import { SidebarLayout } from '@/components/sidebar';

interface Props {
  title?: string;
}

const { title } = Astro.props;
const pathname = Astro.url.pathname;
---

<Layout title={title}>
  <SidebarLayout pathname={pathname} client:load>
    <slot />
  </SidebarLayout>
</Layout>
```

#### 3. Update vaults.astro
**File**: `packages/web/src/pages/vaults.astro`

```astro
---
import SidebarLayout from '@/layouts/SidebarLayout.astro';
import { VaultDirectory } from '@/vault-directory/vault-directory';
---

<SidebarLayout title="Vault Directory - DeFi Panda">
  <div class="min-h-screen bg-muted">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">Vault Directory</h1>
        <p class="text-muted-foreground">
          Discover and analyze ERC4626 vaults across the DeFi ecosystem
        </p>
      </div>

      <VaultDirectory client:load />
    </div>
  </div>
</SidebarLayout>
```

#### 4. Update vault details page
**File**: `packages/web/src/pages/vaults/[chainId]/[address]/[...tab].astro`

```astro
---
import SidebarLayout from '@/layouts/SidebarLayout.astro';
import { VaultDetails } from '@/vault-details/vault-details';
import { allowedChainIdsSchema } from '@/app/wagmi-provider';
import { addressSchema } from '@/lib/schema';
import { getTabConfig, tabSchema } from '@/vault-details/components/vault-tabs';

const {
  chainId: chainIdParam,
  address: addressParam,
  tab: tabParam,
} = Astro.params;

const chainId = allowedChainIdsSchema.parse(chainIdParam);
const vaultAddress = addressSchema.parse(addressParam);
const activeTab = tabSchema.parse(tabParam);

const tabConfig = getTabConfig(activeTab);

if (!tabConfig) {
  throw new Error(`Invalid tab: ${activeTab}`);
}

const pageTitle = `Vault ${tabConfig.label} - DeFi Panda`;
---

<SidebarLayout title={pageTitle}>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto px-4 py-8">
      <VaultDetails
        vaultAddress={vaultAddress}
        chainId={chainId}
        activeTab={activeTab}
        client:load
      />
    </div>
  </div>
</SidebarLayout>
```

#### 5. Update index.astro (optional - redirects anyway)
**File**: `packages/web/src/pages/index.astro`

```astro
---
import SidebarLayout from '@/layouts/SidebarLayout.astro';
---

<SidebarLayout title="DeFi Panda - Analytics Platform">
  <div class="flex items-center justify-center min-h-screen">
    <h1 class="text-2xl">Welcome to DeFi Panda!</h1>
  </div>
</SidebarLayout>
```

#### 6. Create placeholder Activity page
**File**: `packages/web/src/pages/activity.astro`

```astro
---
import SidebarLayout from '@/layouts/SidebarLayout.astro';
---

<SidebarLayout title="Activity - DeFi Panda">
  <div class="min-h-screen bg-muted">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">Activity</h1>
        <p class="text-muted-foreground">
          Track recent activity across the DeFi ecosystem
        </p>
      </div>

      <div class="flex items-center justify-center py-16 text-muted-foreground">
        Coming soon...
      </div>
    </div>
  </div>
</SidebarLayout>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && npm run build`
- [ ] Lint passes: `cd packages/web && npm run lint`
- [ ] Dev server starts: `cd packages/web && npm run dev` (manual check that no errors)

#### Manual Verification:
- [ ] Navigate to http://localhost:3000/vaults - sidebar visible on desktop
- [ ] Sidebar collapse button works (collapses to icons)
- [ ] Navigation links work (Home, Vault Directory, Activity)
- [ ] Vault detail page loads with sidebar
- [ ] Vault tabs still function correctly
- [ ] Mobile view shows bottom nav instead of sidebar

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the UI works before proceeding to the next phase.

---

## Phase 6: Test with Playwright

### Overview
Write and run Playwright tests to verify sidebar and navigation functionality.

### Changes Required:

#### 1. Create Playwright test file
**File**: `packages/web/e2e/sidebar.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation', () => {
  test('desktop: sidebar is visible and navigable', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/vaults');

    // Sidebar should be visible
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Logo should be visible
    await expect(page.getByAltText('DeFi Panda')).toBeVisible();

    // Navigation items should be visible
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vault Directory' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible();

    // Vault Directory should be active
    const vaultLink = page.getByRole('link', { name: 'Vault Directory' });
    await expect(vaultLink).toHaveAttribute('data-active', 'true');
  });

  test('desktop: sidebar collapse works', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/vaults');

    // Find and click collapse trigger
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click();

    // Sidebar should be collapsed (icon mode)
    const sidebarWrapper = page.locator('[data-sidebar-state]');
    await expect(sidebarWrapper).toHaveAttribute('data-sidebar-state', 'collapsed');

    // Click again to expand
    await trigger.click();
    await expect(sidebarWrapper).toHaveAttribute('data-sidebar-state', 'expanded');
  });

  test('desktop: navigation works correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/vaults');

    // Click Activity link
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL('/activity');

    // Click Vault Directory link
    await page.getByRole('link', { name: 'Vault Directory' }).click();
    await expect(page).toHaveURL('/vaults');
  });

  test('mobile: bottom nav is visible instead of sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/vaults');

    // Sidebar should not be visible
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    // Bottom nav should be visible
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    // Navigation items in bottom nav
    await expect(bottomNav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Vault Directory' })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: 'Activity' })).toBeVisible();
  });

  test('mobile: bottom nav navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/vaults');

    const bottomNav = page.locator('nav.fixed.bottom-0');

    // Click Activity link
    await bottomNav.getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL('/activity');

    // Click Vault Directory link
    await bottomNav.getByRole('link', { name: 'Vault Directory' }).click();
    await expect(page).toHaveURL('/vaults');
  });

  test('vault details page has working sidebar and tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to a vault (assuming there's at least one)
    await page.goto('/vaults');

    // Click on first vault card (if exists)
    const vaultCard = page.locator('[data-testid="vault-card"]').first();
    if (await vaultCard.isVisible()) {
      await vaultCard.click();

      // Sidebar should still be visible
      const sidebar = page.locator('[data-sidebar="sidebar"]');
      await expect(sidebar).toBeVisible();

      // Vault tabs should be visible
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    }
  });
});
```

#### 2. Update Playwright config if needed
**File**: `packages/web/playwright.config.ts` (create if doesn't exist)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Playwright tests pass: `cd packages/web && npx playwright test`

#### Manual Verification:
- [ ] Review test results and screenshots
- [ ] Verify no visual regressions

**Implementation Note**: After completing this phase and all tests pass, the implementation is complete.

---

## Testing Strategy

### Unit Tests:
- Navigation config exports correct items
- `getActiveNavItem` correctly identifies active routes

### Integration Tests (Playwright):
- Sidebar visibility on desktop
- Bottom nav visibility on mobile
- Navigation between pages
- Collapse/expand functionality
- Active state highlighting

### Manual Testing Steps:
1. Open http://localhost:3000/vaults on desktop browser
2. Verify sidebar with logo, nav items visible
3. Click collapse button - verify icons only mode
4. Click each nav item - verify navigation works
5. Resize browser to mobile width (<768px)
6. Verify bottom nav appears, sidebar hidden
7. Click nav items in bottom nav
8. Open vault detail page, verify tabs work with sidebar

## Performance Considerations

- Sidebar state is managed by shadcn's SidebarProvider with cookie persistence
- No additional API calls for navigation
- CSS-based responsive switching (no JS re-renders for mobile/desktop)
- Bottom nav uses `fixed` positioning with `z-50` for proper layering

## Migration Notes

- No data migration required
- No breaking changes to existing functionality
- Vault detail breadcrumbs can be removed in a follow-up (redundant with sidebar)

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0006.md`
- shadcn sidebar docs: https://ui.shadcn.com/blocks/sidebar
- sidebar-07 variant (collapses to icons)
