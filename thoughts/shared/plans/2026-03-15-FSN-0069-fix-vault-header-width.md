# FSN-0069: Move VaultDetailHeader to Full Width

## Overview

Restructure the vault detail layout so `VaultDetailHeader` spans the full container width, with the two-column row (children + deposit/withdraw panel) sitting below it.

## Current State

In `vault-detail-layout.tsx:29-47`, a single `flex-row` wraps both the header and the action panel side-by-side. The header is constrained to the left column (`flex-1`), leaving ~380px of horizontal space unused.

## Desired End State

- `VaultDetailHeader` renders above the two-column row at full container width
- The two-column row contains only `{children}` (left, `flex-1`) and `VaultActionTabs` (right, 380px sticky)
- No other components change — deposit/withdraw panel keeps its width, stickiness, and mobile ordering

## What We're NOT Doing

- No new routes for deposit/withdraw
- No changes to VaultDetailHeader internals
- No changes to VaultActionTabs internals
- No changes to mobile behavior (deposit/withdraw still `order-first` on mobile)

## Implementation

### Changes Required

**File**: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`

Move `VaultDetailHeader` out of the left column div, above the flex row. Add `space-y-6` to the outer wrapper to maintain spacing between header and content row.

```tsx
// FROM (lines 29-47):
<div className="flex flex-col lg:flex-row gap-6">
  <div className="flex-1 min-w-0 space-y-6">
    <VaultDetailHeader ... />
    {children}
  </div>
  <div className="w-full lg:w-[380px] shrink-0 order-first lg:order-last">
    <div className="lg:sticky lg:top-6">
      <VaultActionTabs ... />
    </div>
  </div>
</div>

// TO:
<div className="space-y-6">
  <VaultDetailHeader ... />
  <div className="flex flex-col lg:flex-row gap-6">
    <div className="flex-1 min-w-0">
      {children}
    </div>
    <div className="w-full lg:w-[380px] shrink-0 order-first lg:order-last">
      <div className="lg:sticky lg:top-6">
        <VaultActionTabs ... />
      </div>
    </div>
  </div>
</div>
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] Lint passes: `pnpm --filter web lint`

#### Manual Verification:
- [ ] Header spans full width on desktop
- [ ] Tab navigation row spans full width
- [ ] Deposit/withdraw panel stays 380px on the right, sticky on scroll
- [ ] On mobile, deposit/withdraw panel still appears above content
- [ ] Tab content (Overview, Depositors, Activity) renders correctly in the left column

## References

- Ticket: `thoughts/kuba/tickets/fsn_0069-fix-in-vault-header.md`
- Layout file: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`
