# Per-Protocol shadcn Themes Implementation Plan

## Overview

Add per-protocol theming to vault detail pages so that each vault renders in a theme matching its protocol: **Default** (neutral), **Fusion** (purple `#8429ff`), and **YO Protocol** (neon `#D6FF34`). Themes are applied via CSS class scoping on the vault detail layout wrapper.

## Current State Analysis

- **Three theme scopes exist** in `global.css`: `:root` (light), `.dark` (dark), `.yo` (light), `.dark.yo` (dark)
- **No Fusion theme exists** — Fusion vaults fall through to the default neutral theme
- **Per-vault theming already works** in `layout.tsx:36-53`: `getThemeClassForVaultApp(vault.app)` returns `'yo'` or `''`
- **`AppId`** is `'fusion' | 'yo'` — maps directly to theme classes via `APP_THEME_CLASS` in `app-config.ts:119-122`
- **shadcn components** all use CSS variable-backed utilities (`bg-primary`, `text-muted-foreground`, etc.) — changing the variables changes the theme everywhere

### Key Discoveries:

- Fusion brand color is `#8429ff` (purple) from `logo-fusion-by-wGenie.svg` and `logo-icon.svg`
- Theme designed and previewed on tweakcn.com — both light and dark modes validated
- YO theme already complete and working — no changes needed
- The `layout.tsx` wraps themed content in `<div className={themeClass}>` — CSS scoping handles the rest

## Desired End State

- Visiting a **Fusion vault** detail page shows a purple-accented theme
- Visiting a **YO Protocol vault** detail page shows the neon green/black YO theme (unchanged)
- Visiting a **vault with no protocol match** falls through to the default neutral theme
- Light/dark mode works correctly within all three themes
- The vault list page is NOT themed (per scope requirement)

### Verification:

- Navigate to a Fusion vault → see purple accents on cards, buttons, charts, borders
- Navigate to a YO vault → see neon green accents (unchanged from current)
- Toggle dark/light mode → both modes render correctly for each protocol
- Vault list page → remains on default neutral theme

## What We're NOT Doing

- Not theming the vault list page or any page outside vault detail
- Not creating a theme picker/selector — themes are automatic based on protocol
- Not changing the YO theme (already complete)
- Not adding fonts per theme (only YO has a custom font already)
- Not adding new shadcn components

## Implementation Approach

This is a CSS-only change + one small config update. The existing theming infrastructure does all the heavy lifting.

## Phase 1: Add Fusion Theme CSS

### Overview

Add `.fusion` light and dark theme scopes to `global.css`, modeled on the existing `.yo` pattern.

### Changes Required:

#### 1. Add Fusion theme CSS variables

**File**: `packages/web/src/styles/global.css`
**Changes**: Add `.fusion` and `:is(.dark.fusion, .dark .fusion)` blocks after the `.yo` blocks (before `@theme inline`)

```css
.fusion {
  --background: #faf9ff;
  --foreground: #1a1025;
  --card: #f3f0ff;
  --card-foreground: #1a1025;
  --popover: #f3f0ff;
  --popover-foreground: #1a1025;
  --primary: #8429ff;
  --primary-foreground: #ffffff;
  --secondary: #ede8ff;
  --secondary-foreground: #1a1025;
  --muted: #ede8ff;
  --muted-foreground: #6b5f7d;
  --accent: #ede8ff;
  --accent-foreground: #1a1025;
  --destructive: #e5484d;
  --border: oklch(0.53 0.31 292 / 12%);
  --input: oklch(0.53 0.31 292 / 15%);
  --ring: #8429ff;
  --chart-1: #8429ff;
  --chart-2: #a855f7;
  --chart-3: #6d28d9;
  --chart-4: #c084fc;
  --chart-5: #7c3aed;
  --sidebar: #f3f0ff;
  --sidebar-foreground: #1a1025;
  --sidebar-primary: #8429ff;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #ede8ff;
  --sidebar-accent-foreground: #1a1025;
  --sidebar-border: oklch(0.53 0.31 292 / 12%);
  --sidebar-ring: #8429ff;
}

:is(.dark.fusion, .dark .fusion) {
  --background: #0d0a14;
  --foreground: #f0ecf7;
  --card: #1a1525;
  --card-foreground: #f0ecf7;
  --popover: #1a1525;
  --popover-foreground: #f0ecf7;
  --primary: #8429ff;
  --primary-foreground: #ffffff;
  --secondary: #2a2035;
  --secondary-foreground: #f0ecf7;
  --muted: #2a2035;
  --muted-foreground: #a89bbd;
  --accent: #2a2035;
  --accent-foreground: #c084fc;
  --destructive: #e5484d;
  --border: oklch(0.53 0.31 292 / 15%);
  --input: oklch(0.53 0.31 292 / 20%);
  --ring: #8429ff;
  --chart-1: #8429ff;
  --chart-2: #a855f7;
  --chart-3: #6d28d9;
  --chart-4: #c084fc;
  --chart-5: #7c3aed;
  --sidebar: #110d1a;
  --sidebar-foreground: #f0ecf7;
  --sidebar-primary: #8429ff;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #2a2035;
  --sidebar-accent-foreground: #f0ecf7;
  --sidebar-border: oklch(0.53 0.31 292 / 15%);
  --sidebar-ring: #8429ff;
}
```

#### 2. Update theme class mapping

**File**: `packages/web/src/lib/app-config.ts`
**Changes**: Update `APP_THEME_CLASS` to map `'fusion'` → `'fusion'` instead of `''`

```typescript
const APP_THEME_CLASS: Record<AppId, string> = {
  fusion: 'fusion',
  yo: 'yo',
};
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] CSS parses without errors (Tailwind build): `cd packages/web && npx @tailwindcss/cli build src/styles/global.css --output /dev/null`
- [ ] Dev server starts without errors: `cd packages/web && pnpm dev`

#### Manual Verification:

- [ ] Navigate to a Fusion vault detail page — see purple accents
- [ ] Navigate to a YO vault detail page — see neon green accents (unchanged)
- [ ] Toggle dark/light mode on both Fusion and YO vault pages
- [ ] Vault list page remains on default neutral theme
- [ ] No visual regressions on other pages

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

## Testing Strategy

### Manual Testing Steps:

1. Start dev server: `cd packages/web && pnpm dev`
2. Navigate to a Fusion vault (any Ethereum mainnet vault, e.g., `/vaults/1/0x...`)
3. Verify purple accent on buttons, cards borders, charts
4. Toggle dark mode — verify dark purple theme
5. Navigate to a YO vault (e.g., `/vaults/8453/0x...` for yoUSD)
6. Verify neon green theme unchanged
7. Go to vault list page → verify default neutral theme

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0071-shadcn-themes.md`
- Fusion brand color source: `packages/web/public/assets/logo-fusion-by-wGenie.svg` (`fill: #8429ff`)
- Theme designed on: tweakcn.com/editor/theme
- Existing YO theme: `packages/web/src/styles/global.css:76-130`
- Theme class mapping: `packages/web/src/lib/app-config.ts:119-126`
- Vault detail layout (applies theme): `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx:36-53`
