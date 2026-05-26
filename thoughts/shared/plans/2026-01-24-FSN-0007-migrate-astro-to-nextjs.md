# Migrate Astro to Next.js Implementation Plan

## Overview

Migrate the `packages/web` Astro 5.5.5 application to Next.js 16.1.x with **App Router** for Vercel deployment. The application is a DeFi analytics dashboard with React 19 components, Tailwind CSS 4.x styling, Web3 integration via Wagmi/Viem, and data fetching with TanStack React Query.

## Current State Analysis

### Technology Stack (Current)
- **Framework**: Astro 5.5.5 with SSR (`output: 'server'`)
- **React**: 19.0.0 with `client:load` hydration
- **Styling**: Tailwind CSS 4.1.11 via `@tailwindcss/vite`
- **Data Fetching**: TanStack React Query 5.x + Axios
- **Blockchain**: Wagmi 2.15.6 + Viem 2.31.6
- **UI Library**: Radix UI components (shadcn/ui style)
- **Testing**: Vitest 3.2.4 + Testing Library
- **Storybook**: @storybook/react-vite 9.x

### File Structure (Current)
```
packages/web/
├── src/
│   ├── pages/                  # Astro pages (to be replaced)
│   │   ├── index.astro
│   │   ├── vaults.astro
│   │   ├── activity.astro
│   │   └── vaults/[chainId]/[address]/[...tab].astro
│   ├── layouts/                # Astro layouts (to be replaced)
│   │   ├── Layout.astro
│   │   └── SidebarLayout.astro
│   ├── components/ui/          # ~27 shadcn-style components
│   ├── vault-directory/        # Feature module
│   ├── vault-details/          # Feature module
│   ├── vault-metrics/          # Feature module
│   ├── flow-chart/             # Feature module
│   ├── depositors-list/        # Feature module
│   ├── depositors-chart/       # Feature module
│   ├── account/                # Feature module
│   ├── app/                    # Provider wrappers
│   ├── lib/                    # Utilities
│   ├── hooks/                  # Shared hooks
│   └── styles/global.css       # Tailwind + CSS variables
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

### Key Discoveries

1. **120+ React components** are fully portable (no Astro-specific code)
2. **4 Astro pages** need conversion to Next.js App Router pages
3. **2 Astro layouts** need conversion to Next.js layouts
4. **Routing redirects** configured in `astro.config.mjs`:
   - `/` → `/vaults`
   - `/vaults/[chainId]/[address]` → `/vaults/[chainId]/[address]/overview`
5. **Environment variables** use `PUBLIC_` prefix (Astro) → `NEXT_PUBLIC_` (Next.js)
6. **Tailwind CSS 4.x** uses `@tailwindcss/vite` → needs `@tailwindcss/postcss` for Next.js

## Desired End State

A fully functional Next.js 16.1.x application with:
- **App Router structure** (`src/app/` directory)
- Server Components for static content, Client Components for interactive parts
- Tailwind CSS 4.x with PostCSS integration
- All existing functionality preserved
- Vercel-ready configuration
- Updated Storybook with @storybook/nextjs

### Target File Structure (App Router)
```
packages/web/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── vaults/
│   │   │   ├── layout.tsx          # Vaults layout with sidebar
│   │   │   ├── page.tsx            # /vaults page
│   │   │   └── [chainId]/
│   │   │       └── [address]/
│   │   │           └── [...tab]/
│   │   │               └── page.tsx # /vaults/[chainId]/[address]/[...tab]
│   │   └── activity/
│   │       ├── layout.tsx          # Activity layout with sidebar
│   │       └── page.tsx            # /activity page
│   ├── components/ui/              # Unchanged
│   ├── vault-directory/            # Add 'use client'
│   ├── vault-details/              # Add 'use client'
│   ├── ... (feature modules)       # Add 'use client' where needed
│   ├── lib/                        # Update env vars
│   └── styles/global.css           # Unchanged
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

### Verification Criteria
- `npm run dev` starts development server on port 3000
- `npm run build` completes without errors
- All pages render correctly
- React Query data fetching works
- Web3 wallet connection works
- Storybook runs with `npm run storybook`
- All tests pass with `npm run test`

## What We're NOT Doing

- NOT changing React component logic or business functionality
- NOT refactoring feature modules (vault-directory, vault-details, etc.)
- NOT upgrading other dependencies beyond what's required for Next.js
- NOT adding new features or pages
- NOT changing the API client or data fetching logic (except environment variable access)

## Implementation Approach

The migration follows a **parallel replacement strategy**:
1. Create Next.js App Router structure alongside Astro files
2. Migrate configuration first
3. Convert pages and layouts to App Router convention
4. Update component imports and add client directives
5. Remove Astro-specific files

---

## Phase 1: Configuration Migration

### Overview
Set up Next.js configuration and dependencies while preserving Tailwind CSS 4.x styling.

### Changes Required:

#### 1. Update package.json

**File**: `packages/web/package.json`

**Remove Astro dependencies:**
```json
{
  "dependencies": {
    // REMOVE these:
    "@astrojs/node": "^9.1.3",
    "@astrojs/react": "4.2.2",
    "@astrojs/sitemap": "3.3.0",
    "astro": "5.5.5",
    "@tailwindcss/vite": "4.0.17",
    "@vitejs/plugin-react": "4.7.0"
  },
  "devDependencies": {
    // REMOVE these:
    "eslint-plugin-astro": "1.3.1",
    "prettier-plugin-astro": "0.14.1",
    "vite": "7.0.6",
    "vite-plugin-checker": "0.10.2",
    "@storybook/react-vite": "^9.0.18"
  }
}
```

**Add Next.js dependencies:**
```json
{
  "dependencies": {
    "next": "^16.1.2",
    "@tailwindcss/postcss": "^4.1.11"
  },
  "devDependencies": {
    "@storybook/nextjs": "^9.0.18",
    "@storybook/experimental-nextjs-vite": "^9.0.18"
  }
}
```

**Update scripts:**
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  }
}
```

#### 2. Create next.config.ts

**File**: `packages/web/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Handle redirects (migrated from astro.config.mjs)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vaults',
        permanent: true,
      },
      {
        source: '/vaults/:chainId/:address',
        destination: '/vaults/:chainId/:address/overview',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
```

#### 3. Create postcss.config.mjs

**File**: `packages/web/postcss.config.mjs`

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

#### 4. Update tsconfig.json

**File**: `packages/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 5. Update .env.example

**File**: `packages/web/.env.example`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# RPC URLs for blockchain networks
NEXT_PUBLIC_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/your-key
NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/your-key
NEXT_PUBLIC_RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/your-key
```

#### 6. Update ESLint Configuration

**File**: `packages/web/eslint.config.js`

Remove `eslint-plugin-astro` import and configuration.

#### 7. Update Prettier Configuration

**File**: `packages/web/.prettierrc.json`

Remove `prettier-plugin-astro` from plugins and `.astro` file overrides.

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes without errors
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] ESLint runs without Astro-related errors: `npm run lint`

#### Manual Verification:
- [ ] Verify all dependencies are correctly installed
- [ ] Check that no Astro packages remain in node_modules

**Implementation Note**: After completing this phase, pause for manual confirmation before proceeding to the next phase.

---

## Phase 2: Environment Variables Migration

### Overview
Update all environment variable references from Astro's `import.meta.env.PUBLIC_` to Next.js's `process.env.NEXT_PUBLIC_`.

### Changes Required:

#### 1. API Client

**File**: `packages/web/src/lib/api-client.ts`

```typescript
// Change from:
baseURL: import.meta.env.PUBLIC_API_URL

// Change to:
baseURL: process.env.NEXT_PUBLIC_API_URL
```

#### 2. Wagmi Provider

**File**: `packages/web/src/app/wagmi-provider.tsx`

```typescript
// Change from:
const transports = {
  [mainnet.id]: http(import.meta.env.PUBLIC_VITE_RPC_URL_MAINNET),
  [arbitrum.id]: http(import.meta.env.PUBLIC_VITE_RPC_URL_ARBITRUM),
  [base.id]: http(import.meta.env.PUBLIC_VITE_RPC_URL_BASE),
};

// Change to:
const transports = {
  [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL_MAINNET),
  [arbitrum.id]: http(process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM),
  [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE),
};
```

#### 3. Storybook Configuration

**File**: `packages/web/.storybook/main.ts`

Update env configuration to use `NEXT_PUBLIC_` prefix.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] No `import.meta.env` references remain: `grep -r "import.meta.env" src/`

#### Manual Verification:
- [ ] Environment variables are accessible in components

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 3: App Router Structure

### Overview
Create the Next.js App Router structure with layout and page components.

### Changes Required:

#### 1. Create Root Layout

**File**: `packages/web/src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'DeFi Panda',
  description: 'ERC4626 Vault Analytics Dashboard',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

#### 2. Create Vaults Layout with Sidebar

**File**: `packages/web/src/app/vaults/layout.tsx`

```tsx
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function VaultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarLayout pathname={pathname}>
      {children}
    </SidebarLayout>
  );
}
```

#### 3. Create Vaults Page

**File**: `packages/web/src/app/vaults/page.tsx`

```tsx
import { VaultDirectoryPage } from './vault-directory-page';

export const metadata = {
  title: 'Vault Directory - DeFi Panda',
};

export default function VaultsPage() {
  return <VaultDirectoryPage />;
}
```

**File**: `packages/web/src/app/vaults/vault-directory-page.tsx`

```tsx
'use client';

import { VaultDirectory } from '@/vault-directory/vault-directory';

export function VaultDirectoryPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Vault Directory</h1>
          <p className="text-muted-foreground">
            Discover and analyze ERC4626 vaults across the DeFi ecosystem
          </p>
        </div>
        <VaultDirectory />
      </div>
    </div>
  );
}
```

#### 4. Create Vault Details Dynamic Route

**File**: `packages/web/src/app/vaults/[chainId]/[address]/[...tab]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { VaultDetailsPage } from './vault-details-page';
import { getTabConfig, isValidTab } from '@/vault-details/components/vault-tabs';
import { isValidChainId } from '@/app/wagmi-provider';
import { isAddress } from 'viem';

interface PageProps {
  params: Promise<{
    chainId: string;
    address: string;
    tab: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tab } = await params;
  const activeTab = tab?.[0] || 'overview';
  const tabConfig = getTabConfig(activeTab);

  return {
    title: `Vault ${tabConfig?.label || 'Details'} - DeFi Panda`,
  };
}

export default async function VaultPage({ params }: PageProps) {
  const { chainId: chainIdParam, address: addressParam, tab } = await params;

  // Validate chainId
  const chainId = parseInt(chainIdParam, 10);
  if (!isValidChainId(chainId)) {
    notFound();
  }

  // Validate address
  if (!isAddress(addressParam)) {
    notFound();
  }

  // Validate tab
  const activeTab = tab?.[0] || 'overview';
  if (!isValidTab(activeTab)) {
    notFound();
  }

  return (
    <VaultDetailsPage
      chainId={chainId}
      vaultAddress={addressParam}
      activeTab={activeTab}
    />
  );
}
```

**File**: `packages/web/src/app/vaults/[chainId]/[address]/[...tab]/vault-details-page.tsx`

```tsx
'use client';

import { VaultDetails } from '@/vault-details/vault-details';
import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';

interface VaultDetailsPageProps {
  chainId: ChainId;
  vaultAddress: Address;
  activeTab: string;
}

export function VaultDetailsPage({
  chainId,
  vaultAddress,
  activeTab,
}: VaultDetailsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <VaultDetails
          vaultAddress={vaultAddress}
          chainId={chainId}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
```

#### 5. Create Activity Page

**File**: `packages/web/src/app/activity/layout.tsx`

```tsx
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarLayout pathname={pathname}>
      {children}
    </SidebarLayout>
  );
}
```

**File**: `packages/web/src/app/activity/page.tsx`

```tsx
export const metadata = {
  title: 'Activity - DeFi Panda',
};

export default function ActivityPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Activity</h1>
        <p className="text-muted-foreground">Coming soon...</p>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] `/vaults` page renders correctly with vault directory
- [ ] `/vaults/1/0x.../overview` renders correctly with vault details
- [ ] `/activity` page renders correctly
- [ ] Sidebar navigation works between pages
- [ ] Tab navigation on vault details works

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 4: Component Updates

### Overview
Add `'use client'` directives to interactive components and add validation helper functions.

### Changes Required:

#### 1. Add 'use client' to Feature Components

**Files to update (add `'use client';` at the top):**
- `packages/web/src/vault-directory/vault-directory.tsx`
- `packages/web/src/vault-details/vault-details.tsx`
- `packages/web/src/vault-metrics/vault-metrics.tsx`
- `packages/web/src/flow-chart/flow-chart.tsx`
- `packages/web/src/depositors-list/depositors-list.tsx`
- `packages/web/src/depositors-chart/depositors-chart.tsx`
- `packages/web/src/account/account.tsx`
- `packages/web/src/app/app-providers.tsx`
- `packages/web/src/app/query-client-provider.tsx`
- `packages/web/src/app/wagmi-provider.tsx`
- `packages/web/src/components/sidebar/sidebar-layout.tsx`

#### 2. Update Wagmi Provider for Chain Validation

**File**: `packages/web/src/app/wagmi-provider.tsx`

Add validation function:
```typescript
export function isValidChainId(chainId: number): chainId is ChainId {
  return ALLOWED_CHAIN_IDS.includes(chainId as ChainId);
}
```

#### 3. Update Tab Schema for Validation

**File**: `packages/web/src/vault-details/components/vault-tabs.tsx`

Add validation function:
```typescript
export function isValidTab(tab: string): boolean {
  return tabSchema.safeParse(tab).success;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] All interactive components render correctly
- [ ] React Query data fetching works
- [ ] No hydration mismatch errors in browser console

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 5: Storybook Migration

### Overview
Update Storybook configuration to use @storybook/nextjs.

### Changes Required:

#### 1. Update .storybook/main.ts

**File**: `packages/web/.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
    NEXT_PUBLIC_RPC_URL_BASE: process.env.NEXT_PUBLIC_RPC_URL_BASE,
    NEXT_PUBLIC_RPC_URL_ARBITRUM: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM,
  }),
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }
    return config;
  },
};

export default config;
```

#### 2. Update Story Files

Change import in all story files:
```typescript
// From:
import type { Meta, StoryObj } from '@storybook/react-vite';

// To:
import type { Meta, StoryObj } from '@storybook/react';
```

### Success Criteria:

#### Automated Verification:
- [ ] Storybook builds: `npm run build-storybook`
- [ ] Storybook starts: `npm run storybook`

#### Manual Verification:
- [ ] All stories render correctly
- [ ] Theme switching works
- [ ] A11y addon works

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 6: Testing Configuration

### Overview
Update Vitest configuration for Next.js compatibility.

### Changes Required:

#### 1. Update vitest.config.ts

**File**: `packages/web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Tests run: `npm run test:run`
- [ ] All tests pass

#### Manual Verification:
- [ ] Test UI works: `npm run test:ui`

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 7: Cleanup

### Overview
Remove Astro-specific files and configurations.

### Changes Required:

#### 1. Delete Astro Files

**Files/directories to delete:**
- `packages/web/astro.config.mjs`
- `packages/web/src/pages/` (entire directory)
- `packages/web/src/layouts/` (entire directory)

#### 2. Update lint-staged Configuration

**File**: `packages/web/package.json`

Remove `.astro` from lint-staged patterns:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] No Astro files remain: `find . -name "*.astro" -type f`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm run test:run`

#### Manual Verification:
- [ ] Application works in development mode: `npm run dev`
- [ ] Production build works: `npm run build && npm run start`

---

## Testing Strategy

### Unit Tests
- Verify existing tests still pass after migration
- No new unit tests required (functionality unchanged)

### Integration Tests
- Verify routing works for all pages
- Verify redirects work correctly
- Verify dynamic routes with parameters

### Manual Testing Steps
1. Start development server: `npm run dev`
2. Open `http://localhost:3000`
3. Verify redirect to `/vaults` works
4. Verify vault directory page loads and displays vaults
5. Click on a vault to verify navigation to details page
6. Verify all tabs on vault details page work
7. Verify wallet connection works (if wallet available)
8. Check browser console for errors
9. Test mobile responsive layout
10. Run production build: `npm run build && npm run start`

## Performance Considerations

- Server Components reduce client-side JavaScript bundle
- Next.js automatic code splitting per route
- Turbopack for faster development builds
- Image optimization available if needed later

## Migration Notes

### Environment Variable Migration
| Astro | Next.js |
|-------|---------|
| `PUBLIC_API_URL` | `NEXT_PUBLIC_API_URL` |
| `PUBLIC_VITE_RPC_URL_MAINNET` | `NEXT_PUBLIC_RPC_URL_MAINNET` |
| `PUBLIC_VITE_RPC_URL_BASE` | `NEXT_PUBLIC_RPC_URL_BASE` |
| `PUBLIC_VITE_RPC_URL_ARBITRUM` | `NEXT_PUBLIC_RPC_URL_ARBITRUM` |

### Routing Differences
| Astro | Next.js App Router |
|-------|-------------------|
| `pages/vaults.astro` | `app/vaults/page.tsx` |
| `pages/vaults/[chainId]/[address]/[...tab].astro` | `app/vaults/[chainId]/[address]/[...tab]/page.tsx` |
| `Astro.params` | `params` prop (async in Next.js 16) |
| `Astro.url.pathname` | `usePathname()` hook |

### Hydration Differences
| Astro | Next.js App Router |
|-------|-------------------|
| `client:load` directive | `'use client'` directive |
| Islands architecture | Server Components by default |
| Astro components (static) | Server Components (static) |

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0007.md`
- Next.js 16 Documentation: https://nextjs.org/docs
- Next.js App Router: https://nextjs.org/docs/app
- Tailwind CSS 4 + Next.js: https://tailwindcss.com/docs/guides/nextjs
- Storybook for Next.js: https://storybook.js.org/docs/get-started/nextjs
