# FSN-0074: Group Vaults by Atomist — Implementation Plan

## Overview

Change `app` (single value) to `apps` (array) in `plasma-vaults.json` and the registry/config code. Each atomist becomes a separate app config. Every current fusion vault keeps `"fusion"` in its apps array and also gets its atomist slug added. This lets us run separate white-label deployments per atomist via `NEXT_PUBLIC_APP_CONFIG=clearstar`.

## Current State

- `plasma-vaults.json`: 78 vaults, each with `"app": "fusion" | "yo"` (single value)
- `vaults-registry.ts`: Zod schema validates `app: z.enum(['fusion', 'yo'])`, `ParsedVault.app: AppId`
- `app-config.ts`: 3 configs (`fusion`, `yo`, `all`), selected by `NEXT_PUBLIC_APP_CONFIG` env var
- `vault layout`: checks `vault.app !== config.id` for access control, `getThemeClassForVaultApp(vault.app)` for theming
- `ponder/contracts.ts`: parses plasma-vaults.json but does NOT use the `app` field — no changes needed

## Desired End State

- `plasma-vaults.json`: every vault has `"apps": ["fusion", "clearstar"]` (array, multiple values)
- 16 new atomist app configs in `app-config.ts`, each with same nav/features as fusion
- Running `NEXT_PUBLIC_APP_CONFIG=clearstar pnpm dev` shows only Clearstar's vaults
- Atomist logos copied to `packages/web/public/assets/atomists/`
- Convenience scripts in `package.json`

### Verification

- `pnpm dev` (default `all`) shows all 78 vaults
- `NEXT_PUBLIC_APP_CONFIG=fusion pnpm dev` shows 73 fusion vaults
- `NEXT_PUBLIC_APP_CONFIG=clearstar pnpm dev` shows only Clearstar's ~8 vaults
- Vault detail pages accessible for vaults in the active config, 404 for others
- TypeScript compiles cleanly: `pnpm --filter @wgenie/fusion-web exec tsc --noEmit`

## What We're NOT Doing

- Custom CSS themes per atomist (ticket says: "use default CSS theme, I will fix that later")
- Any changes to the ponder package (it ignores the `app`/`apps` field)
- Dashboard customization per atomist (uses same fusion dashboard)
- Any changes to the wgenie-webapp repo

## Vault → Atomist Mapping

Based on the wgenie-webapp `src/fusion/plasmaVaults/config/<dir>/` structure and explicit `atomist:` fields:

| Atomist Slug   | Display Name   | Vault Names |
|---------------|---------------|-------------|
| `wgenie-dao`    | wGenie DAO      | wGenie DAI Prime, wGenie USDC Prime (×4), wGenie USDT Prime, wGenie wstETH Base, wGenie wstETH Base (Deprecated), wGenie wstETH Arbitrum, wGenie weETH Ethereum, wGenie stETH Ethereum |
| `clearstar`   | Clearstar     | Singularity Vault, Clearstar Core, Clearstar Synchrotron, Clearstar Synchrotron (Deprecated), yoUSD Loooper, yoETH Loooper, yoGOLD, AlchemistCS |
| `tesseract`   | Tesseract     | Tesseract Managed BTC (×2), Tesseract Managed ETH, Tesseract AVAX Looping |
| `xerberus`    | Xerberus      | Ethereum Xerberus Prime Index, Xerberus Evergreen, Xerberus BASE 10 - Risk Weighted |
| `harvest`     | Harvest       | Autopilot USDC Arbitrum, Autopilot WETH Arbitrum, Autopilot WBTC Arbitrum, Autopilot USDC DRIP Arbitrum, Autopilot USDC Base, Autopilot WETH Base, Autopilot cbBTC Base, USDC Morpho-Only Autopilot, Autopilot USDC Ethereum |
| `reservoir`   | Reservoir     | Reservoir wsrUSD looping, Reservoir ETH Yield, Reservoir BTC Yield, Reservoir High Yield USDC Lending |
| `tau-labs`    | TAU Labs      | TAU Core, TAU Core (Deprecated), TAU Reservoir Pointsmax, TAU Yield Bond ETF, TAU Yield Bond ETF (Deprecated), TAU infiniFi Pointsmax, TAU InfiniFi BTC Carry, TAU InfiniFi ETH Carry, TAU Lending Optimizer, TAU InfiniFi cbBTC Carry, TAU InfiniFi Pointsmaxx - Silo, Magnus Lending Optimizer, AavEthena Loop Mainnet, AavEthena Loop Plasma, Tesseract USDC Lending Optimizer |
| `tanken`      | Tanken        | Tanken WETH Base, Tanken WETH Base (Deprecated) |
| `alphaping`   | Alphaping     | Leveraged Falcon USDC Core, Leveraged sUSDf, Leveraged sUSDf (Deprecated) |
| `k3-capital`  | K3 Capital    | K3 Capital ETH Maxi, K3 ALPHA EUR, K3 Leveraged syrupUSDT Strategy |
| `mev-capital` | MEV Capital   | Strata srUSDe PT Looping |
| `stake-dao`   | Stake DAO     | Stake DAO Smart Save (USDC) |
| `llama-risk`  | Llama Risk    | LlamaRisk crvUSD Optimizer (×2) |
| `tid-capital` | TiD Capital   | TiD Base ETH |
| `sentinel`    | Sentinel      | Auto-Compounding Liquity ETH Stability Pool, Sentinel stcUSD Adaptive Looping |
| `hyperithm`   | Hyperithm     | Hyperithm mHYPER Looping |

**No atomist (fusion-only):** BC Vault One, BTC Valos, F1 Champion Principle Protected Note

**Note:** "Tesseract USDC Lending Optimizer" is in the `tau/` directory in the webapp with `atomist: 'TAU Labs'` — it belongs to tau-labs, not tesseract.

## Atomist Logo Mapping

Copy from `wgenie-webapp/public/atomists/` to `packages/web/public/assets/atomists/`:

| Slug | File |
|------|------|
| `wgenie-dao` | `wgenie-dao.svg` |
| `clearstar` | `clearstar.svg` |
| `tesseract` | `tesseract.svg` |
| `xerberus` | `xerberus.svg` |
| `harvest` | `harvest.svg` |
| `reservoir` | `reservoir.svg` |
| `tau-labs` | `tau-labs.png` |
| `tanken` | `tanken.svg` |
| `alphaping` | `alphaping.svg` |
| `k3-capital` | `k3.png` |
| `mev-capital` | `mev-capital.png` |
| `stake-dao` | (no logo in webapp — empty string) |
| `llama-risk` | `llamarisk.svg` |
| `tid-capital` | `tid-capital.png` |
| `sentinel` | `sentinel.png` |
| `hyperithm` | `hyperithm.png` |

---

## Phase 1: Data Model — `app` → `apps`

### Overview

Change the single `app` field to an `apps` array in `plasma-vaults.json`, update Zod schemas and TypeScript types.

### Changes Required:

#### 1. `plasma-vaults.json` (repo root)

Every vault entry: `"app": "fusion"` → `"apps": ["fusion", "<atomist-slug>"]`

Example before:
```json
{
  "name": "Clearstar Core",
  "address": "0xf2f8386b...",
  "chainId": 8453,
  "protocol": "wGenie Fusion",
  "tags": ["wgenie-fusion"],
  "startBlock": 22140976,
  "url": "https://app.wGenie.io/fusion/base/0xf2f8386b...",
  "app": "fusion"
}
```

Example after:
```json
{
  "name": "Clearstar Core",
  "address": "0xf2f8386b...",
  "chainId": 8453,
  "protocol": "wGenie Fusion",
  "tags": ["wgenie-fusion"],
  "startBlock": 22140976,
  "url": "https://app.wGenie.io/fusion/base/0xf2f8386b...",
  "apps": ["fusion", "clearstar"]
}
```

Rules:
- Current fusion vaults with an atomist: `["fusion", "<atomist-slug>"]`
- Fusion vaults without atomist (BC Vault One, BTC Valos, F1 Champion): `["fusion"]` only
- YO vaults: `["yo"]` (unchanged except array form)

#### 2. `packages/web/src/lib/vaults-registry.ts`

**File**: `packages/web/src/lib/vaults-registry.ts`

Changes:
- Expand `APP_IDS` to include all atomist slugs
- Change schema from `app: z.enum(APP_IDS)` → `apps: z.array(z.enum(APP_IDS))`
- Change `ParsedVault.app` → `ParsedVault.apps: AppId[]`
- Change `APP_VAULTS` filter from `v.app === id` → `v.apps.includes(id)`

```typescript
const APP_IDS = [
  'fusion', 'yo',
  'wgenie-dao', 'clearstar', 'tesseract', 'xerberus', 'harvest',
  'reservoir', 'tau-labs', 'tanken', 'alphaping', 'k3-capital',
  'mev-capital', 'stake-dao', 'llama-risk', 'tid-capital',
  'sentinel', 'hyperithm',
] as const;
export type AppId = (typeof APP_IDS)[number];

const vaultSchema = z.object({
  name: z.string(),
  address: addressSchema,
  chainId: z.number(),
  protocol: z.string(),
  apps: z.array(z.enum(APP_IDS)),
  tags: z.array(z.string()),
  startBlock: z.number(),
  url: z.url(),
});

export interface ParsedVault {
  name: string;
  address: Address;
  chainId: number;
  protocol: string;
  apps: AppId[];
  tags: string[];
  startBlock: number;
  url: string;
}

// Filtering
export const APP_VAULTS =
  getAppConfig().id === 'all'
    ? ERC4626_VAULTS
    : ERC4626_VAULTS.filter((v) => v.apps.includes(getAppConfig().id as AppId));
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-web exec tsc --noEmit`
- [ ] Ponder still parses vaults: `pnpm --filter @wgenie/fusion-ponder exec tsc --noEmit`
- [ ] Tests pass: `pnpm --filter @wgenie/fusion-web test:run`

#### Manual Verification:
- [ ] `pnpm dev` still shows all vaults (default `all` config)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: App Configs & Assets

### Overview

Create an `AppConfig` for each of the 16 atomists, copy logos, update theme mapping.

### Changes Required:

#### 1. Copy atomist logos

Copy files from `../wgenie-webapp/public/atomists/` → `packages/web/public/assets/atomists/`:

```bash
cp /Users/kuba/wgenie-labs/wgenie-webapp/public/atomists/* /Users/kuba/wgenie-labs/wgenie-monorepo/packages/web/public/assets/atomists/
```

#### 2. `packages/web/src/lib/app-config.ts`

Add atomist configs. Each one follows the fusion template (same nav, same features) but with atomist-specific name/logo and empty `themeClass`.

```typescript
// Helper to create atomist configs with fusion-like defaults
function atomistConfig(id: AppId, name: string, logo: string): AppConfig {
  return {
    id,
    name,
    title: name,
    description: `${name} Vaults Dashboard`,
    logo,
    themeClass: '',
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
}

// Add all atomist configs to the configs record
const configs: Record<ConfigId, AppConfig> = {
  all: allConfig,
  fusion: fusionConfig,
  yo: yoConfig,
  'wgenie-dao': atomistConfig('wgenie-dao', 'wGenie DAO', '/assets/atomists/wgenie-dao.svg'),
  'clearstar': atomistConfig('clearstar', 'Clearstar', '/assets/atomists/clearstar.svg'),
  'tesseract': atomistConfig('tesseract', 'Tesseract', '/assets/atomists/tesseract.svg'),
  'xerberus': atomistConfig('xerberus', 'Xerberus', '/assets/atomists/xerberus.svg'),
  'harvest': atomistConfig('harvest', 'Harvest', '/assets/atomists/harvest.svg'),
  'reservoir': atomistConfig('reservoir', 'Reservoir', '/assets/atomists/reservoir.svg'),
  'tau-labs': atomistConfig('tau-labs', 'TAU Labs', '/assets/atomists/tau-labs.png'),
  'tanken': atomistConfig('tanken', 'Tanken', '/assets/atomists/tanken.svg'),
  'alphaping': atomistConfig('alphaping', 'Alphaping', '/assets/atomists/alphaping.svg'),
  'k3-capital': atomistConfig('k3-capital', 'K3 Capital', '/assets/atomists/k3.png'),
  'mev-capital': atomistConfig('mev-capital', 'MEV Capital', '/assets/atomists/mev-capital.png'),
  'stake-dao': atomistConfig('stake-dao', 'Stake DAO', '/assets/atomists/stake-dao.png'),
  'llama-risk': atomistConfig('llama-risk', 'Llama Risk', '/assets/atomists/llamarisk.svg'),
  'tid-capital': atomistConfig('tid-capital', 'TiD Capital', '/assets/atomists/tid-capital.png'),
  'sentinel': atomistConfig('sentinel', 'Sentinel', '/assets/atomists/sentinel.png'),
  'hyperithm': atomistConfig('hyperithm', 'Hyperithm', '/assets/atomists/hyperithm.png'),
};
```

#### 3. Update `APP_THEME_CLASS` and `getThemeClassForVaultApp`

The function needs to handle `apps: AppId[]` instead of `app: AppId`. In the `all` config, when viewing a vault, pick the first app that has a theme class.

```typescript
const APP_THEME_CLASS: Partial<Record<AppId, string>> = {
  fusion: 'fusion',
  yo: 'yo',
};

export function getThemeClassForVaultApps(apps: AppId[]): string {
  for (const app of apps) {
    const theme = APP_THEME_CLASS[app];
    if (theme) return theme;
  }
  return '';
}
```

#### 4. Update `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`

Change vault access check and theme lookup to use `apps` array:

```typescript
// Before:
if (vault && config.id !== 'all' && vault.app !== config.id) {
  notFound();
}
const themeClass = config.id === 'all' && vault
  ? getThemeClassForVaultApp(vault.app)
  : config.themeClass;

// After:
if (vault && config.id !== 'all' && !vault.apps.includes(config.id as AppId)) {
  notFound();
}
const themeClass = config.id === 'all' && vault
  ? getThemeClassForVaultApps(vault.apps)
  : config.themeClass;
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-web exec tsc --noEmit`
- [ ] Tests pass: `pnpm --filter @wgenie/fusion-web test:run`
- [ ] Logo files exist: `ls packages/web/public/assets/atomists/`

#### Manual Verification:
- [ ] `NEXT_PUBLIC_APP_CONFIG=clearstar pnpm dev` shows only Clearstar's vaults
- [ ] `NEXT_PUBLIC_APP_CONFIG=harvest pnpm dev` shows only Harvest's vaults
- [ ] Vault detail pages render correctly with atomist logo in sidebar
- [ ] Default `pnpm dev` (all) still works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Package Scripts

### Overview

Add convenience `dev:*` scripts to `packages/web/package.json`.

### Changes Required:

#### 1. `packages/web/package.json`

Add dev scripts for each atomist:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:fusion": "NEXT_PUBLIC_APP_CONFIG=fusion next dev --turbopack",
    "dev:yo": "NEXT_PUBLIC_APP_CONFIG=yo next dev --turbopack",
    "dev:wgenie-dao": "NEXT_PUBLIC_APP_CONFIG=wgenie-dao next dev --turbopack",
    "dev:clearstar": "NEXT_PUBLIC_APP_CONFIG=clearstar next dev --turbopack",
    "dev:tesseract": "NEXT_PUBLIC_APP_CONFIG=tesseract next dev --turbopack",
    "dev:xerberus": "NEXT_PUBLIC_APP_CONFIG=xerberus next dev --turbopack",
    "dev:harvest": "NEXT_PUBLIC_APP_CONFIG=harvest next dev --turbopack",
    "dev:reservoir": "NEXT_PUBLIC_APP_CONFIG=reservoir next dev --turbopack",
    "dev:tau-labs": "NEXT_PUBLIC_APP_CONFIG=tau-labs next dev --turbopack",
    "dev:tanken": "NEXT_PUBLIC_APP_CONFIG=tanken next dev --turbopack",
    "dev:alphaping": "NEXT_PUBLIC_APP_CONFIG=alphaping next dev --turbopack",
    "dev:k3-capital": "NEXT_PUBLIC_APP_CONFIG=k3-capital next dev --turbopack",
    "dev:mev-capital": "NEXT_PUBLIC_APP_CONFIG=mev-capital next dev --turbopack",
    "dev:stake-dao": "NEXT_PUBLIC_APP_CONFIG=stake-dao next dev --turbopack",
    "dev:llama-risk": "NEXT_PUBLIC_APP_CONFIG=llama-risk next dev --turbopack",
    "dev:tid-capital": "NEXT_PUBLIC_APP_CONFIG=tid-capital next dev --turbopack",
    "dev:sentinel": "NEXT_PUBLIC_APP_CONFIG=sentinel next dev --turbopack",
    "dev:hyperithm": "NEXT_PUBLIC_APP_CONFIG=hyperithm next dev --turbopack"
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web run dev:clearstar` starts without errors (stop after confirming startup)

#### Manual Verification:
- [ ] Scripts appear in `pnpm --filter @wgenie/fusion-web run` output

---

## References

- Ticket: `thoughts/kuba/tickets/fsn_0074-group-vaults-by-atomist.md`
- Prior ticket: `thoughts/kuba/tickets/fsn_0073-update-fusion-vaults-list.md`
- App config plan: `thoughts/shared/plans/2026-03-14-FSN-0068-app-config.md`
- Webapp atomist configs: `/Users/kuba/wgenie-labs/wgenie-webapp/src/fusion/plasmaVaults/config/`
- Webapp atomist logos: `/Users/kuba/wgenie-labs/wgenie-webapp/public/atomists/`
