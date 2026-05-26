# Session: FSN-0063 Code Review Fixes (Phase 1-3)

**Date**: 2026-03-11
**Ticket**: `thoughts/kuba/tickets/fsn_0063-fix-plan.md`
**Previous session**: `sessions/session-code-review-fsn0061.md` (code review)

## What happened

Implemented fixes from the FSN-0061 code review. All changes staged, verified in Storybook via Playwright headed browser.

## Changes made

### Mastra agent tools (packages/mastra/src/tools/yo-treasury/)

1. **Deduplicated `existingActionSchema`** — moved to `types.ts`, imported by `create-yo-allocation-action.ts`, `create-yo-swap-action.ts`, `create-yo-withdraw-action.ts`. Was identically defined 3x.

2. **Replaced `z.any()` with proper Zod schemas** — `get-treasury-allocation.ts` output schema now has typed `assets` and `yoPositions` arrays with all fields spelled out (address, name, symbol, decimals, balance, priceUsd, valueUsd, etc.).

3. **Removed unused `parts` variable** — `get-treasury-allocation.ts:33-35` computed `tokenCount`, `positionCount`, `parts[]` but never used them.

4. **Exported `existingActionSchema`** from `index.ts` barrel.

### Web components (packages/web/src/yo-treasury/)

5. **Extracted `useVaultReads` hook** — new file `hooks/use-vault-reads.ts`. Consolidates 5 shared `useReadContract` calls from deposit-form and withdraw-form:
   - `asset()` → assetAddress
   - `decimals()` → assetDecimals
   - `symbol()` → assetSymbol
   - `balanceOf(user)` → shareBalance
   - `convertToAssets(shares)` → positionAssets
   Plus 2 new oracle reads:
   - `getPriceOracleMiddleware()` → priceOracleAddress
   - `getAssetPrice(asset)` → tokenPriceUsd (price, decimals)

6. **USD pricing via on-chain oracle** — replaced `$1/token` assumption. `useVaultReads` reads `PlasmaVault.getPriceOracleMiddleware()` then `getAssetPrice(underlyingAddress)` to get the real USD price. Works for all assets (USDC, WETH, cbBTC, EURC). `formatAmountUsd()` helper formats amounts using the oracle price.

7. **Changed fallback symbol** from `'USDC'` to `'...'` — prevents misleading display when contract reads are slow.

8. **Deleted `withdraw-placeholder.tsx`** — dead code, replaced by `WithdrawForm` in an earlier session.

9. **Mobile responsive layout** — `yo-treasury-tab.tsx` changed from `flex gap-4` with `w-80` to `flex flex-col lg:flex-row gap-4` with `w-full lg:w-80`. Forms appear first on mobile (order-1), chat second (order-2). Desktop retains side-by-side layout.

## Review findings addressed

| # | Finding | Status |
|---|---------|--------|
| 1 | USD = $1/token assumption | FIXED — on-chain price oracle |
| 2 | Hardcoded `?? 'USDC'` / `?? 6` fallbacks | FIXED — `?? '...'` / `?? 6` (6 is safe default) |
| 3 | Unused `parts` variable | FIXED — removed |
| 4 | Dead WithdrawPlaceholder | FIXED — deleted |
| 5 | Non-null assertions on vaultAddress | NOT ADDRESSED (create page, separate concern) |
| 6 | `z.any()` in output schema | FIXED — proper typed schemas |
| 7 | Deposit/Withdraw code duplication | FIXED — extracted `useVaultReads` hook |
| 8 | `existingActionSchema` duplicated 3x | FIXED — shared in `types.ts` |
| 12 | No mobile responsive layout | FIXED — `flex-col lg:flex-row` |

Findings 9-11 (agent prompt hardcodes, sequential multicalls, create-flow dedup) not addressed — lower priority.

## Browser testing (Playwright headed)

Tested in Storybook at `http://localhost:6007` via Playwright CLI (`--headed`).

### Treasury Tab story (`yo-treasury-treasury-tab--base`)
- **Desktop (1280x800)**: Chat left, deposit + withdraw forms right — side-by-side layout correct
- **Mobile (375x812)**: Forms stacked on top (order-1), chat below (order-2) — responsive layout correct
- **Symbol**: Shows "USDC" from on-chain read (not fallback)
- **Position display**: `0.08 USDC ($0.08)` — oracle price working
- **Deposit input**: typed `0.5` → shows `$0.50` — `formatAmountUsd` working
- **Withdraw input**: typed `0.05` → shows `$0.05` — `formatAmountUsd` working
- **Console errors**: Only favicon 404s — no real errors

## Files changed (staged)

```
M  packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts
M  packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts
M  packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts
M  packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts
M  packages/mastra/src/tools/yo-treasury/index.ts
M  packages/mastra/src/tools/yo-treasury/types.ts
M  packages/web/src/yo-treasury/components/deposit-form.tsx
M  packages/web/src/yo-treasury/components/withdraw-form.tsx
D  packages/web/src/yo-treasury/components/withdraw-placeholder.tsx
M  packages/web/src/yo-treasury/components/yo-treasury-tab.tsx
A  packages/web/src/yo-treasury/hooks/use-vault-reads.ts
```

## New file: `use-vault-reads.ts`

Key design decisions:
- **Two ABIs inline** (`plasmaVaultPriceOracleAbi`, `getAssetPriceAbi`) — minimal, only what's needed. Not worth adding to SDK for 2 functions.
- **Price as `number`** — `Number(price) / 10 ** Number(decimals)`. Safe because USD prices don't exceed JS float precision.
- **Returns `tokenPriceUsd: number | undefined`** — `undefined` while loading. `formatAmountUsd` shows raw token amount (no `$`) when price unavailable.
