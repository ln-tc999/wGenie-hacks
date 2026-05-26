# FSN-0053: YO Treasury Chat QA & Refinement

## Overview

Refine the YO Treasury chat UI components to use existing shared components (TokenIcon, BlockExplorerAddress) and proper number formatting (2 decimals for APRs and $ values). This makes the hackathon demo more polished and human-friendly.

## Current State Analysis

The staged chat UI works but displays raw data:
- Vault addresses shown as plain text
- No token icons
- APY/TVL strings not consistently formatted
- Dollar values not formatted to 2 decimals

### Existing Components to Reuse:
- `TokenIcon` at `packages/web/src/components/token-icon/token-icon.tsx` — takes `chainId` + `address`
- `BlockExplorerAddress` at `packages/web/src/components/ui/block-explorer-address.tsx` — truncated address + copy + explorer link
- `formatCurrency` at `packages/web/src/lib/utils.ts` — `$1.2M` compact USD
- `formatNumberWithSuffix` at `packages/web/src/lib/format-number-with-suffix.ts` — `1.23K` style

## What We're NOT Doing

- Changing agent tools or Mastra backend
- Adding new tool output types
- Modifying the chat component itself (treasury-chat.tsx)
- Mobile responsive polish

## Phase 1: Update YoVaultsList

**File**: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx`

Changes:
- Add `chainId` prop
- Add `TokenIcon` for each vault's underlying asset (using `underlyingAddress` from output)
- Replace raw address text with `BlockExplorerAddress`
- Format APY to 2 decimal places
- Format TVL with `formatCurrency`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Vault cards show token icons for underlying assets
- [ ] Vault addresses show as clickable links with copy button
- [ ] APY shows 2 decimal places (e.g., "19.23% APY")
- [ ] TVL shows compact format (e.g., "$1.2M")

---

## Phase 2: Update TreasuryBalances

**File**: `packages/web/src/yo-treasury/components/treasury-balances.tsx`

Changes:
- Add `chainId` prop
- Add `TokenIcon` for each unallocated asset
- Add `TokenIcon` for each YO position's underlying asset
- Format dollar values to 2 decimal places consistently
- Add `BlockExplorerAddress` for YO vault positions

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles

#### Manual Verification:
- [ ] Unallocated assets show token icons
- [ ] YO positions show token icons
- [ ] All dollar values show 2 decimal places
- [ ] Vault addresses are clickable explorer links

---

## Phase 3: Update YoToolRenderer

**File**: `packages/web/src/yo-treasury/components/yo-tool-renderer.tsx`

Changes:
- Pass `chainId` to `YoVaultsList` and `TreasuryBalances`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles

---

## Phase 4: Browser Verification

Test via Playwright MCP at `http://localhost:3000/yo-treasury`:
- [ ] Page loads with sidebar
- [ ] Type "What are my yield options?" — vault cards render with token icons, formatted APY/TVL, explorer addresses
- [ ] Verify no console errors

## References

- Ticket: `thoughts/kuba/tickets/fsn_0053-qa.md`
- Previous plan: `thoughts/shared/plans/2026-03-06-FSN-0050-yo-treasury-web-chat.md`
