# FSN-0072: "Vaults Panda" All-Vaults App Mode

## Overview

Add a new `'all'` app mode called "Vaults Panda" that shows every vault from `plasma-vaults.json` regardless of `app` field. Per-vault theming applies on vault detail pages based on each vault's `app` field. This becomes the new default when `NEXT_PUBLIC_APP_CONFIG` is unset.

## Current State Analysis

- `AppId = 'fusion' | 'yo'` — used for both vault schema validation and app config
- `APP_VAULTS` filters by `getAppConfig().id` at module load (`vaults-registry.ts:91-93`)
- Vault detail layout blocks cross-app vaults with `notFound()` (`layout.tsx:31`)
- Theme is global on `<html>` via `config.themeClass` (`layout.tsx:24`)
- Tag-based component switching (`yo-treasury`, `yo-vault`) already works per-vault independent of app config
- Dashboard branches on `config.id === 'yo'` — non-yo falls through to Fusion dashboard

### Key Discoveries:

- `flowCharts`, `depositorsList`, `activityPage` feature flags are defined but never read at runtime — only `alphaTab` is checked (`vault-tabs.config.ts:38`)
- Per-vault component switching uses `vault.tags.includes()` directly, not app config — will work out of the box in "all" mode
- `AppId` is shared between vault Zod schema and config — need to separate vault app IDs from config IDs

## Desired End State

- `NEXT_PUBLIC_APP_CONFIG` unset or `'all'` → "Vaults Panda" mode showing all vaults
- `NEXT_PUBLIC_APP_CONFIG=fusion` → existing Fusion behavior (unchanged)
- `NEXT_PUBLIC_APP_CONFIG=yo` → existing YO behavior (unchanged)
- Vault detail pages apply the correct theme based on the vault's `app` field (e.g., YO vaults get `dark yo` theme even in "all" mode)
- Navigation: Dashboard, Vaults List, Depositors, Activity (general-purpose, like Fusion)

### Verification:

- Visit `/vaults` — see all vaults (fusion + yo) listed
- Visit a YO vault page — theme switches to neon yellow/black YO brand
- Visit a Fusion vault page — theme stays dark
- Navigate back to dashboard — theme reverts to dark
- Dashboard shows Fusion-style analytics

## What We're NOT Doing

- No new pages or routes
- No changes to `plasma-vaults.json`
- No new CSS themes — reusing existing `dark` and `dark yo`
- No changes to YO or Fusion configs when run explicitly

## Implementation Approach

Separate vault app IDs (used for schema validation) from config IDs (which include `'all'`). Add a new config, update vault filtering and the cross-app guard, and add a small client component for per-vault theming on detail pages.

## Phase 1: Config & Registry

### Overview

Add the `'all'` config ID, create the "Vaults Panda" config, make it the default, and update `APP_VAULTS` filtering.

### Changes Required:

#### 1. Vault Registry — separate vault AppId from config ID

**File**: `packages/web/src/lib/vaults-registry.ts`
**Changes**: Keep `APP_IDS` and `AppId` for vault schema validation (unchanged). Export it so `app-config.ts` can extend it.

No changes needed — `AppId` stays as `'fusion' | 'yo'` for vault validation. The config-level type is defined in `app-config.ts`.

#### 2. App Config — add ConfigId and allConfig

**File**: `packages/web/src/lib/app-config.ts`
**Changes**:

```ts
// New type that extends AppId with 'all'
export type ConfigId = AppId | 'all';

// Update AppConfig interface
export interface AppConfig {
  id: ConfigId;  // was AppId
  // ... rest unchanged
}

// Add new config
const allConfig: AppConfig = {
  id: 'all',
  name: 'Vaults Panda',
  title: 'Vaults Panda',
  description: 'ERC4626 Vault Analytics Dashboard',
  logo: '/assets/logo-fusion-by-wGenie.svg', // placeholder
  themeClass: 'dark',
  navItems: [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Vaults List', url: '/vaults', icon: Vault },
    { title: 'Depositors', url: '/depositors', icon: Users },
    { title: 'Activity', url: '/activity', icon: Activity },
  ],
  features: {
    alphaTab: true,
    flowCharts: true,
    depositorsList: true,
    activityPage: true,
  },
};

// Update configs record
const configs: Record<ConfigId, AppConfig> = {
  all: allConfig,
  fusion: fusionConfig,
  yo: yoConfig,
};

// Update default from 'fusion' to 'all'
export function getAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  const id = (process.env.NEXT_PUBLIC_APP_CONFIG || 'all') as ConfigId;
  cachedConfig = configs[id] ?? allConfig;
  return cachedConfig;
}
```

Also export a theme mapping for per-vault use:

```ts
const APP_THEME_CLASS: Record<AppId, string> = {
  fusion: 'dark',
  yo: 'dark yo',
};

export function getThemeClassForVaultApp(app: AppId): string {
  return APP_THEME_CLASS[app] ?? 'dark';
}
```

#### 3. Vault Registry — update APP_VAULTS filter

**File**: `packages/web/src/lib/vaults-registry.ts`
**Changes**: When config is `'all'`, return all vaults.

```ts
export const APP_VAULTS =
  getAppConfig().id === 'all'
    ? ERC4626_VAULTS
    : ERC4626_VAULTS.filter((v) => v.app === getAppConfig().id);
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] App starts without errors: `pnpm --filter web dev`

#### Manual Verification:

- [ ] With no `NEXT_PUBLIC_APP_CONFIG` set, `/vaults` shows all vaults (fusion + yo)
- [ ] With `NEXT_PUBLIC_APP_CONFIG=fusion`, only fusion vaults appear
- [ ] With `NEXT_PUBLIC_APP_CONFIG=yo`, only yo vaults appear
- [ ] Sidebar shows "Vaults Panda" name and Fusion-style nav items in default mode

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Vault Access & Per-Vault Theming

### Overview

Remove the cross-app vault guard in "all" mode and add a client component that applies the correct theme on vault detail pages.

### Changes Required:

#### 1. Vault detail layout — relax cross-app guard

**File**: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
**Changes**: Skip the `notFound()` guard when config is `'all'`.

```ts
const config = getAppConfig();
if (vault && config.id !== 'all' && vault.app !== config.id) {
  notFound();
}
```

#### 2. Per-vault theme override component

**File**: `packages/web/src/components/vault-theme-override.tsx` (new)
**Changes**: Client component that overrides `<html>` className based on vault's app.

```tsx
'use client';

import { useEffect } from 'react';

export function VaultThemeOverride({ themeClass }: { themeClass: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const original = html.className;
    if (themeClass === original) return;
    html.className = themeClass;
    return () => {
      html.className = original;
    };
  }, [themeClass]);

  return null;
}
```

#### 3. Render theme override in vault layout

**File**: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
**Changes**: When config is `'all'` and vault has a known app, render the theme override.

```tsx
import { getThemeClassForVaultApp } from '@/lib/app-config';
import { VaultThemeOverride } from '@/components/vault-theme-override';

// Inside the component, after the guard:
const showThemeOverride = config.id === 'all' && vault;

return (
  <>
    {showThemeOverride && (
      <VaultThemeOverride themeClass={getThemeClassForVaultApp(vault.app)} />
    )}
    <VaultDetailLayout ...>
      {children}
    </VaultDetailLayout>
  </>
);
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors

#### Manual Verification:

- [ ] In "all" mode, navigating to a YO vault shows neon yellow/black theme
- [ ] Navigating to a Fusion vault shows standard dark theme
- [ ] Navigating back to dashboard from a YO vault reverts to dark theme
- [ ] In explicit `fusion` mode, YO vault URLs still return 404
- [ ] In explicit `yo` mode, Fusion vault URLs still return 404

**Implementation Note**: After completing this phase and all verification passes, the feature is complete.

---

## Testing Strategy

### Manual Testing Steps:

1. Unset `NEXT_PUBLIC_APP_CONFIG` → visit `/` → see Fusion-style dashboard with "Vaults Panda" branding
2. Visit `/vaults` → see all vaults from all apps
3. Click a YO vault → theme switches to YO brand
4. Click browser back → theme reverts
5. Click a Fusion vault → standard dark theme
6. Set `NEXT_PUBLIC_APP_CONFIG=fusion` → verify only fusion vaults visible, YO vault URLs 404
7. Set `NEXT_PUBLIC_APP_CONFIG=yo` → verify only yo vaults visible, fusion vault URLs 404

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0072-extra-app-mode-for-all-vaults.md`
- App config: `packages/web/src/lib/app-config.ts`
- Vault registry: `packages/web/src/lib/vaults-registry.ts`
- Root layout: `packages/web/src/app/layout.tsx`
- Vault detail layout: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
- Theme CSS: `packages/web/src/styles/global.css` (lines 42–106)
