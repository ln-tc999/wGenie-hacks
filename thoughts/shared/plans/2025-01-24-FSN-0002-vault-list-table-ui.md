# Vault List Table UI Implementation Plan

## Overview

Convert the current card/grid-based vault list UI (`/vaults` page) into a table-based UI that allows users to easily compare vault performance metrics side by side. Copy chain icon component from wgenie-webapp for chain indicators.

## Current State Analysis

**Current Implementation:**
- `vault-grid.tsx:54` - Renders a 4-column responsive grid of VaultCard components
- `vault-card.tsx:20-128` - Individual cards with vault metrics
- Data source: `useVaultDirectoryContext()` provides `vaults`, `loading`, `error`, `navigateToVault`

**Existing Table Pattern (to follow):**
- `packages/web/src/depositors-list/components/depositors-table.tsx`
- `packages/web/src/depositors-list/components/depositors-table-header.tsx`
- `packages/web/src/depositors-list-item/components/depositors-list-item-content.tsx`

**Chain Icon Source:**
- `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/`

## Desired End State

A table-based vault list with the following columns (in order):
| Asset | Vault Name | TVL | Depositors | Net Flow (7d) | Created |

- Chain icon displayed alongside Asset column
- Rows are clickable and navigate to vault details
- Horizontal scroll on mobile to show all columns
- Loading skeleton matches table structure

### Verification:
- Visit `http://localhost:3000/vaults`
- See table instead of card grid
- All vault data displayed in 6 columns
- Chain icons visible for each vault
- Rows clickable → navigate to vault detail page

## What We're NOT Doing

- ❌ Sorting functionality (display data as-is from API)
- ❌ Filtering functionality (existing filters stay as-is)
- ❌ Column resizing or reordering
- ❌ Pagination changes (keep existing pagination)

---

## Phase 1: Copy Chain Icon Component

### Overview
Copy the chain icon component from wgenie-webapp to fusion-monorepo.

### Changes Required:

#### 1. Copy Chain Icon Files

Copy the following files from wgenie-webapp to fusion-monorepo:

| Source | Destination |
|--------|-------------|
| `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/mainnet-svg.tsx` | `packages/web/src/components/chain-icon/mainnet-svg.tsx` |
| `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/arbitrum-svg.tsx` | `packages/web/src/components/chain-icon/arbitrum-svg.tsx` |
| `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/base-svg.tsx` | `packages/web/src/components/chain-icon/base-svg.tsx` |
| `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/avalanche-svg.tsx` | `packages/web/src/components/chain-icon/avalanche-svg.tsx` |
| `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/plasma-svg.tsx` | `packages/web/src/components/chain-icon/plasma-svg.tsx` |

#### 2. Create Simplified ChainIcon Component

Create `packages/web/src/components/chain-icon/chain-icon.tsx` based on `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/chain-icon.tsx` with the following modifications:
- Remove testnet badge logic (not needed)
- Remove chains not used in fusion (unichain, tac, ink)
- Update imports to use `@/lib/utils` for `cn`
- Simplify Props interface to just `chainId: number` and `className?: string`
- Update Wrapper default size to `w-6 h-6` with `p-0.5`

#### 3. Create Index Export

Create `packages/web/src/components/chain-icon/index.ts`:
```ts
export { ChainIcon } from './chain-icon';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd packages/web && npx tsc --noEmit`
- [ ] All chain icon files exist at expected paths

#### Manual Verification:
- [ ] N/A - component not yet used

---

## Phase 2: Create Table Components

### Overview
Create the new table components: header, row, and skeleton.

### Changes Required:

#### 1. Create VaultTableHeader Component
**File**: `packages/web/src/vault-directory/components/vault-table-header.tsx`

Follow pattern from `packages/web/src/depositors-list/components/depositors-table-header.tsx`

Columns (in order):
1. Asset (left-aligned)
2. Vault Name (left-aligned)
3. TVL (right-aligned)
4. Depositors (right-aligned)
5. Net Flow (7d) (right-aligned)
6. Created (right-aligned)

#### 2. Create VaultTableRow Component
**File**: `packages/web/src/vault-directory/components/vault-table-row.tsx`

Follow pattern from `packages/web/src/depositors-list-item/components/depositors-list-item-content.tsx`

Requirements:
- Import `ChainIcon` from `@/components/chain-icon`
- Asset cell: ChainIcon + asset badge (like current card footer)
- Vault Name: font-medium
- TVL: use `formatCurrency` from `@/lib/utils`, font-mono
- Depositors: use `toLocaleString()`
- Net Flow: color-coded (green-600 for positive, destructive for negative)
- Created: use `Intl.DateTimeFormat`, text-muted-foreground
- Row is clickable with keyboard support (follow pattern from `vault-card.tsx:47-59`)

#### 3. Create VaultTableSkeleton Component
**File**: `packages/web/src/vault-directory/components/vault-table-skeleton.tsx`

Follow pattern from `packages/web/src/depositors-list/components/depositors-table-skeleton.tsx`

- 10 skeleton rows
- Match column structure (6 columns)
- First column: circular skeleton for chain icon + rounded-full skeleton for asset badge

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd packages/web && npx tsc --noEmit`
- [ ] Linting passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] N/A - components not yet integrated

---

## Phase 3: Update VaultGrid to Use Table

### Overview
Replace the grid layout in VaultGrid with the new table components.

### Changes Required:

#### 1. Update VaultGrid Component
**File**: `packages/web/src/vault-directory/components/vault-grid.tsx`

Changes:
- Replace `VaultCard` import with `VaultTableRow`
- Replace `VaultGridSkeleton` import with `VaultTableSkeleton`
- Add imports: `Table`, `TableBody` from `@/components/ui/table`, `VaultTableHeader`
- Replace grid div with table structure wrapped in `<div className="rounded-md border">`
- Keep existing error and empty states unchanged

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd packages/web && npx tsc --noEmit`
- [ ] Linting passes: `cd packages/web && npm run lint`
- [ ] Dev server starts without errors: `cd packages/web && npm run dev`

#### Manual Verification:
- [ ] Visit `http://localhost:3000/vaults` - table displays instead of card grid
- [ ] All 6 columns visible: Asset (with chain icon), Vault Name, TVL, Depositors, Net Flow (7d), Created
- [ ] Chain icons display correctly for each vault
- [ ] Click on any row → navigates to vault detail page
- [ ] Keyboard navigation works (Tab to focus, Enter/Space to activate)
- [ ] Loading state shows skeleton table
- [ ] Table scrolls horizontally on narrow viewports

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 4.

---

## Phase 4: Cleanup (Optional)

### Overview
Remove unused VaultCard component and related skeleton if no longer needed elsewhere.

### Changes Required:

#### 1. Check for Other Usages
Before deleting, verify `vault-card.tsx` is not imported elsewhere:
```bash
grep -r "vault-card" packages/web/src --include="*.tsx" --include="*.ts"
```

#### 2. Remove Unused Files (if safe)
If VaultCard is only used by VaultGrid (which we replaced), delete:
- `packages/web/src/vault-directory/components/vault-card.tsx`
- `packages/web/src/vault-directory/components/vault-grid-skeleton.tsx`

### Success Criteria:

#### Automated Verification:
- [ ] No broken imports: `cd packages/web && npx tsc --noEmit`
- [ ] Linting passes: `cd packages/web && npm run lint`

#### Manual Verification:
- [ ] Application still works correctly at `/vaults`

---

## Testing Strategy

### Manual Testing Steps:
1. Start dev server: `cd packages/web && npm run dev`
2. Navigate to `http://localhost:3000/vaults`
3. Verify table layout displays correctly with 6 columns
4. Check chain icons appear next to each asset badge
5. Click a row and confirm navigation to vault details
6. Resize browser to test horizontal scroll on mobile widths
7. Refresh page to verify loading skeleton appears briefly

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0002.md`
- Chain icon source: `/Users/wGenie/wgenie-labs/wgenie-webapp/src/components/chain-icon/`
- Existing table pattern: `packages/web/src/depositors-list/components/depositors-table.tsx`
- shadcn Table component: `packages/web/src/components/ui/table.tsx`
- Current vault card (for click behavior): `packages/web/src/vault-directory/components/vault-card.tsx`
