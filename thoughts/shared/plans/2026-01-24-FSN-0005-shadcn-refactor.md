# shadcn Refactor Implementation Plan

## Overview

Refactor frontend components to leverage shadcn patterns and components, replacing custom implementations with standard shadcn solutions. Focus on high-impact areas first: Input component, Badge component, Alert/Empty components, and improving the MultiSelect with Command pattern.

## Current State Analysis

- **Frontend Location**: `packages/web/` (Astro + React)
- **Shadcn Config**: `packages/web/components.json` using "new-york" style
- **21 shadcn components** already installed in `src/components/ui/`
- **Custom implementations** identified that could benefit from shadcn

### Key Discoveries:
- MultiSelect uses raw `<input>` instead of shadcn Input/CommandInput (`multiselect.tsx:94-100`)
- Asset tags use manual div styling instead of Badge (`vault-card.tsx:117-119`)
- ErrorBoundary is custom when Alert + Empty pattern exists (`error-boundary.tsx`)
- VaultTabs uses custom anchor styling, could adopt shadcn TabsList visual pattern (`vault-tabs.tsx:53-73`)
- Loading states use manual animated divs instead of Spinner (`vault-toolbar.tsx:17`)
- VaultCardSkeleton uses raw div instead of Card component (`vault-grid-skeleton.tsx:5`)

## Desired End State

After this plan is complete:
1. All form inputs use shadcn Input component
2. All badge/tag elements use shadcn Badge component
3. Error states use shadcn Alert pattern
4. MultiSelect uses Command pattern for search/selection
5. Loading spinners use shadcn Spinner
6. Skeleton components use Card where appropriate
7. All unused custom CSS/code is removed

### Verification:
- `pnpm run build` completes successfully
- `pnpm run lint` passes
- Manual test at http://localhost:3000/vaults shows correct styling
- No regressions in filter, table, and card functionality

## What We're NOT Doing

- Converting VaultTabs to client-side switching (keeping anchor-based navigation for SSR)
- Adding new features or functionality
- Changing component APIs unless necessary
- Refactoring non-UI code

## Implementation Approach

Install missing shadcn components first, then refactor in order of impact and dependency. Each phase is independently testable.

---

## Phase 1: Install Missing shadcn Components

### Overview
Add shadcn components that are not yet installed but needed for the refactor.

### Changes Required:

#### 1. Install Input Component
**Command**:
```bash
cd packages/web && pnpm dlx shadcn@latest add input
```

#### 2. Install Badge Component
**Command**:
```bash
cd packages/web && pnpm dlx shadcn@latest add badge
```

#### 3. Install Alert Component
**Command**:
```bash
cd packages/web && pnpm dlx shadcn@latest add alert
```

#### 4. Install Spinner Component
**Command**:
```bash
cd packages/web && pnpm dlx shadcn@latest add spinner
```

### Success Criteria:

#### Automated Verification:
- [ ] Files exist: `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/alert.tsx`, `src/components/ui/spinner.tsx`
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`

#### Manual Verification:
- [ ] None required for this phase

**Implementation Note**: After completing this phase and all automated verification passes, proceed to Phase 2.

---

## Phase 2: Refactor MultiSelect to Use Command Pattern

### Overview
Replace the raw `<input>` in MultiSelect with CommandInput for better keyboard navigation, accessibility, and consistent styling.

### Changes Required:

#### 1. Update MultiSelect Component
**File**: `packages/web/src/components/ui/multiselect.tsx`
**Changes**: Replace raw input with Command components

```tsx
// Replace the search input section (lines 92-101) with:
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Inside PopoverContent, replace the structure with Command pattern:
<PopoverContent className="w-80 p-0" align="start">
  <Command shouldFilter={false}>
    <CommandInput
      placeholder={searchPlaceholder}
      value={searchTerm}
      onValueChange={setSearchTerm}
    />
    <div className="flex justify-between px-2 py-1.5 border-b">
      <button
        onClick={handleSelectAll}
        className="text-sm text-primary hover:text-primary/80"
        disabled={filteredOptions.length === 0}
      >
        Select all
      </button>
      <button
        onClick={handleClearAll}
        className="text-sm text-muted-foreground hover:text-foreground"
        disabled={selectedCount === 0}
      >
        Clear all
      </button>
    </div>
    <CommandList>
      <CommandEmpty>No items found</CommandEmpty>
      <CommandGroup>
        {filteredOptions.map((option) => (
          <CommandItem
            key={option.value}
            value={option.value}
            onSelect={() => handleToggleItem(option.value)}
          >
            <Checkbox
              checked={value.includes(option.value)}
              className="mr-2"
            />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  </Command>
  {/* Keep the selected items display section */}
</PopoverContent>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Open http://localhost:3000/vaults
- [ ] Test "Underlying Assets" filter - search works, selection works
- [ ] Test "Chains" filter - search works, selection works
- [ ] Test "Protocols" filter - search works, selection works
- [ ] Keyboard navigation works (arrow keys, enter to select)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Refactor Badge Usage

### Overview
Replace manual div-based badge styling with shadcn Badge component across the codebase.

### Changes Required:

#### 1. Update VaultCard Asset Tag
**File**: `packages/web/src/vault-directory/components/vault-card.tsx`
**Changes**: Replace lines 117-119

```tsx
// Add import
import { Badge } from '@/components/ui/badge';

// Replace:
<div className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
  {vault.underlyingAsset}
</div>

// With:
<Badge variant="secondary">{vault.underlyingAsset}</Badge>
```

#### 2. Update VaultTableRow Asset Badge
**File**: `packages/web/src/vault-directory/components/vault-table-row.tsx`
**Changes**: Add Badge import and update usage

```tsx
// Add import
import { Badge } from '@/components/ui/badge';

// Find the asset display and replace with Badge
<Badge variant="secondary">{vault.underlyingAsset}</Badge>
```

#### 3. Update MultiSelect Selected Items
**File**: `packages/web/src/components/ui/multiselect.tsx`
**Changes**: Replace selected item badges (lines 148-161)

```tsx
// Add import
import { Badge } from '@/components/ui/badge';

// Replace the selected items span with:
<Badge variant="secondary" className="gap-1">
  {item.label}
  <button
    onClick={() => handleToggleItem(item.value)}
    className="hover:text-foreground/80"
  >
    <XIcon className="w-3 h-3" />
  </button>
</Badge>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Open http://localhost:3000/vaults
- [ ] Verify asset badges appear correctly on vault cards
- [ ] Verify asset badges appear correctly in vault table rows
- [ ] Verify selected filter items show as badges in MultiSelect dropdowns

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Refactor Error States with Alert

### Overview
Update ErrorBoundary component to use shadcn Alert for consistent error display.

### Changes Required:

#### 1. Update ErrorBoundary Component
**File**: `packages/web/src/errors/components/error-boundary.tsx`
**Changes**: Use Alert component

```tsx
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  error: string;
  onRetry: () => void;
}

export const ErrorBoundary = ({ error, onRetry }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onRetry} className="w-full mt-4">
          Try Again
        </Button>
      </div>
    </div>
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Trigger an error state (e.g., disconnect network) and verify Alert displays correctly
- [ ] Verify "Try Again" button works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Refactor Loading States with Spinner

### Overview
Replace manual loading indicators with shadcn Spinner component.

### Changes Required:

#### 1. Update VaultToolbar Loading State
**File**: `packages/web/src/vault-directory/components/vault-toolbar.tsx`
**Changes**: Replace lines 16-19

```tsx
// Add import
import { Spinner } from '@/components/ui/spinner';

// Replace:
<span className="flex items-center">
  <div className="w-4 h-4 mr-2 bg-muted rounded animate-pulse"></div>
  Loading vaults...
</span>

// With:
<span className="flex items-center gap-2">
  <Spinner size="sm" />
  Loading vaults...
</span>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Open http://localhost:3000/vaults
- [ ] Observe loading state shows spinner animation
- [ ] Spinner disappears when data loads

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Refactor Skeleton Components

### Overview
Update VaultCardSkeleton to use Card component wrapper for consistency.

### Changes Required:

#### 1. Update VaultGridSkeleton
**File**: `packages/web/src/vault-directory/components/vault-grid-skeleton.tsx`
**Changes**: Use Card component

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

const VaultCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="w-10 h-10 rounded-full ml-4" />
      </div>
    </CardHeader>

    <CardContent className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    </CardContent>

    <CardFooter className="border-t">
      <div className="flex items-center justify-between w-full">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </CardFooter>
  </Card>
);

export const VaultGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 20 }).map((_, index) => (
        <VaultCardSkeleton key={index} />
      ))}
    </div>
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Open http://localhost:3000/vaults
- [ ] Observe skeleton cards during loading match actual card structure
- [ ] Skeleton styling is consistent with Card component

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 7: Style VaultTabs with shadcn Pattern

### Overview
Update VaultTabs visual styling to match shadcn TabsList pattern while keeping anchor-based navigation.

### Changes Required:

#### 1. Update VaultTabs Styling
**File**: `packages/web/src/vault-details/components/vault-tabs.tsx`
**Changes**: Apply shadcn TabsList/TabsTrigger visual patterns

```tsx
// Update the tab container and items to match shadcn patterns
// The key classes from shadcn's TabsList and TabsTrigger:

// Container (line 53):
<div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">

// Tab item (lines 57-71):
<a
  key={id}
  className={cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    isActive
      ? 'bg-background text-foreground shadow'
      : 'hover:bg-background/50 hover:text-foreground',
  )}
  href={`/vaults/${chainId}/${vaultAddress}/${id}`}
>
  {label}
</a>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes: `cd packages/web && pnpm run lint`

#### Manual Verification:
- [ ] Navigate to a vault detail page (click any vault card)
- [ ] Verify tabs (Overview, Depositors, Activity, Performance) display correctly
- [ ] Verify active tab is highlighted
- [ ] Verify tab navigation works (clicking tabs navigates)
- [ ] Verify tab description updates when switching tabs

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 8: Cleanup Unused Code

### Overview
Remove any unused imports, dead code, or redundant styles after refactoring.

### Changes Required:

#### 1. Audit and Remove Unused Imports
Run through each modified file and remove unused imports.

#### 2. Check for Duplicate Styles
Review if any custom Tailwind classes are now redundant given shadcn component usage.

#### 3. Run Linter to Catch Issues
```bash
cd packages/web && pnpm run lint --fix
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd packages/web && pnpm run build`
- [ ] TypeScript passes: `cd packages/web && pnpm run typecheck`
- [ ] Lint passes with no warnings: `cd packages/web && pnpm run lint`
- [ ] No unused imports or variables

#### Manual Verification:
- [ ] Full walkthrough of http://localhost:3000/vaults
- [ ] Test all filters
- [ ] Test table and card views
- [ ] Navigate to vault details
- [ ] Test all tabs
- [ ] Verify no visual regressions

**Implementation Note**: This is the final phase. After completing all verification, the refactor is complete.

---

## Testing Strategy

### Unit Tests:
- Existing component tests should continue to pass
- No new unit tests required (behavior unchanged)

### Integration Tests:
- Verify filter combinations work together
- Verify pagination with filters
- Verify navigation between list and detail views

### Manual Testing Steps:
1. Load http://localhost:3000/vaults
2. Test each filter type (TVL, Depositors, Net Flow, Assets, Chains, Protocols)
3. Combine multiple filters
4. Clear all filters
5. Sort by different options
6. Click a vault to view details
7. Navigate through all tabs
8. Go back to list
9. Verify loading states appear correctly
10. Trigger error state and verify display

## Performance Considerations

- No performance impact expected - shadcn components are lightweight wrappers
- Command component adds cmdk dependency (already installed)
- Bundle size should remain similar

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0005.md`
- shadcn documentation: https://ui.shadcn.com
- Existing components: `packages/web/src/components/ui/`
