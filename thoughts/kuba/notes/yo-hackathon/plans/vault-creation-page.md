# Plan: Vault Creation Page & Frontend Integration

## Status: Phase 1 DONE, Phase 2 (YO Treasury Tab) NOT STARTED

This plan was executed across two sessions (see FSN-0054). Only Phase 1 (vault creation page) was completed. Phase 2 (YO Treasury tab on vault detail page) was deferred.

## What Was Done (Session 2026-03-07)

### 1. SDK Export Fix
- `YO_REDEEM_FUSE_SLOT*_ADDRESS` was exported from `packages/sdk/src/markets/yo/index.ts` but NOT re-exported from `packages/sdk/src/index.ts`
- Fixed: added 4 redeem fuse address exports to `packages/sdk/src/index.ts`
- This was blocking the hardhat fork tests

### 2. Fork Tests Updated & Passing (all 5)
- `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- Block number: 42988200
- Uses real deployed YoRedeemFuse addresses from SDK (no in-test deployment)
- Full lifecycle: clone → roles → 9 fuses → deposit → allocate yoUSD → withdraw via YoRedeemFuse → swap USDC→WETH → allocate yoETH → compound swap+allocate

### 3. Vault Creation Page Created
- **File**: `packages/web/src/app/yo-treasury/create/page.tsx`
- Calls `createAndConfigureVault()` from `@wgenie/fusion-sdk`
- Shows progress logs and vault address for copying
- Vault name: `YO Treasury 0x1234...9876 2026-03-07` (date-fns `format()`)
- Added `@wgenie/fusion-sdk` as workspace dependency to web package

### 4. Sidebar Nav Entry Added
- **File**: `packages/web/src/components/sidebar/nav-config.ts`
- "Create YO Treasury" with Plus icon at `/yo-treasury/create`

### 5. Storybook Story Created
- **File**: `packages/web/src/app/yo-treasury/create/create-treasury-vault.stories.tsx`
- Uses `WalletDecorator` for auto-connect
- Renders under "YO Treasury / Create Treasury Vault"
- Verified in Storybook: page renders with heading, description, and button

### 6. YO Treasury Tab (scaffolded but NOT tested)
- `packages/web/src/vault-details/vault-tabs.config.ts` — added `yo` tab
- `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx` — client wrapper
- `packages/web/src/app/vaults/[chainId]/[address]/yo/page.tsx` — server page
- TypeScript compiles, but NOT manually tested

## Files Changed

```
packages/sdk/src/index.ts                              — added YO_REDEEM_FUSE exports
packages/sdk/src/markets/yo/create-vault.ts            — no net change (reverted name experiment)
packages/web/package.json                              — added @wgenie/fusion-sdk dependency
packages/web/src/app/yo-treasury/create/page.tsx       — NEW: vault creation page
packages/web/src/app/yo-treasury/create/create-treasury-vault.stories.tsx — NEW: storybook story
packages/web/src/components/sidebar/nav-config.ts      — added Create YO Treasury nav entry
packages/web/src/vault-details/vault-tabs.config.ts    — added yo tab config
packages/web/src/yo-treasury/components/yo-treasury-tab.tsx — NEW: client wrapper for tab
packages/web/src/app/vaults/[chainId]/[address]/yo/page.tsx — NEW: yo tab page
```

## What's Next

See ticket: `thoughts/kuba/tickets/fsn_0055-vault-creation-ux.md`

The vault creation page works but needs UX refinement:
- Progress feedback during multi-tx flow (~16 transactions)
- Error recovery (what if tx 8 of 16 fails?)
- Post-creation next steps guidance
- Testing with real wallet in Storybook
- Visual polish
