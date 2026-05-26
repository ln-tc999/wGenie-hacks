# FSN-0022: Migrate wagmi to v3 & Unify viem Versions

## Overview

Upgrade wagmi from 2.15.6 to 3.4.2 and unify viem to 2.45.1 across all packages. Unify TypeScript to 5.8.3. Use exact versions everywhere (no `^`, `~`, or `latest`). Update the `web3-data-fetching` skill if needed.

## Current State Analysis

### Version Matrix (Before)

| Package | wagmi | viem | TypeScript |
|---------|-------|------|------------|
| pnpm catalog | — | 2.37.9 | 5.8.3 |
| root override | — | 2.37.9 | — |
| web | 2.15.6 | 2.31.6 | — |
| ponder | — | 2.31.4 | 5.8.3 |
| sdk | — | catalog: | 5.7.3 |
| mastra | — | catalog: | catalog: |
| hardhat-tests | — | 2.31.6 | 5.7.3 |

### Wagmi Usage in web Package (read-only, no wallet connection)

Hooks used (all unchanged in v3):
- `useReadContracts` — `src/vault/hooks/use-vault-data.ts`
- `useReadContract` — `src/account/hooks/use-is-safe-wallet.ts`, `src/vault-metrics/vault-metrics.params.tsx`, `src/depositors-list-item/depositors-list-item.params.tsx`, `src/components/token-icon/token-icon.tsx`
- `useEnsName`, `useEnsAvatar` — `src/account/account.params.tsx`

Config: `src/app/wagmi-provider.tsx` — `createConfig` with HTTP transports, no connectors
Chains: `src/app/chains.config.ts` — imports from `wagmi/chains`

### Key Discovery

The `chains.config.ts` file imports `{ arbitrum, base, mainnet }` from `wagmi/chains`. In wagmi v3, `wagmi/chains` is still available as a re-export of `viem/chains`, so this import continues to work. However, since every other file already imports chains from `viem/chains`, we should migrate this one file for consistency.

## Desired End State

### Version Matrix (After)

| Package | wagmi | viem | TypeScript |
|---------|-------|------|------------|
| pnpm catalog | — | 2.45.1 | 5.8.3 |
| root override | — | 2.45.1 | — |
| web | 3.4.2 | 2.45.1 | — |
| ponder | — | 2.45.1 | 5.8.3 |
| sdk | — | catalog: | catalog: |
| mastra | — | catalog: | catalog: |
| hardhat-tests | — | 2.45.1 | catalog: |

All viem versions resolve to exactly 2.45.1. All TypeScript versions resolve to exactly 5.8.3. Wagmi is 3.4.2. No dynamic version specifiers.

### Verification

- `pnpm install` succeeds with no peer dep warnings for wagmi/viem
- `pnpm --filter @wgenie/fusion-web build` succeeds
- `pnpm --filter @wgenie/fusion-sdk build` succeeds
- `pnpm --filter @wgenie/fusion-ponder typecheck` succeeds
- All existing tests pass
- Web app loads and displays vault data correctly
- Ponder indexing works

## What We're NOT Doing

- Not adding wallet connection / write hooks (project is read-only)
- Not migrating to the Fetch → Mapper → Hook pattern (separate ticket)
- Not upgrading ponder itself (just its viem dependency)
- Not upgrading `@tanstack/react-query` (5.81.5 already meets wagmi v3's `>=5.0.0` requirement)
- Not upgrading hardhat or its viem plugins (separate concern)

## Implementation Approach

This is a low-risk migration because our wagmi usage is 100% read-only. The major v3 breaking changes (`useAccount` → `useConnection`, connector peer deps, mutation destructuring) don't affect us. The core hooks we use (`useReadContract`, `useReadContracts`, `useEnsName`, `useEnsAvatar`) have unchanged APIs.

The main work is:
1. Updating version numbers in 7 files
2. Running `pnpm install` to regenerate the lockfile
3. Fixing the one `wagmi/chains` import for consistency
4. Verifying everything builds and tests pass

---

## Phase 1: Update Dependency Versions

### Overview

Change all package.json files, the pnpm catalog, and the root override to target versions. Use `catalog:` where packages already use it.

### Changes Required

#### 1. pnpm-workspace.yaml

**File**: `pnpm-workspace.yaml`
**Changes**: Update viem in catalog from 2.37.9 to 2.45.1

```yaml
catalog:
  typescript: 5.8.3
  viem: 2.45.1
  zod: 3.24.1
  "@supabase/supabase-js": 2.49.4
```

#### 2. Root package.json

**File**: `package.json`
**Changes**: Update viem override from 2.37.9 to 2.45.1

```json
"pnpm": {
  "overrides": {
    "viem": "2.45.1"
  }
}
```

#### 3. packages/web/package.json

**File**: `packages/web/package.json`
**Changes**: Update wagmi from 2.15.6 to 3.4.2, update viem from 2.31.6 to 2.45.1

```json
"viem": "2.45.1",
"wagmi": "3.4.2",
```

#### 4. packages/ponder/package.json

**File**: `packages/ponder/package.json`
**Changes**: Update viem from 2.31.4 to 2.45.1

```json
"viem": "2.45.1",
```

#### 5. packages/hardhat-tests/package.json

**File**: `packages/hardhat-tests/package.json`
**Changes**: Update viem from 2.31.6 to 2.45.1, update TypeScript from 5.7.3 to catalog:

```json
"dependencies": {
  "viem": "2.45.1",
},
"devDependencies": {
  "typescript": "catalog:",
}
```

#### 6. packages/sdk/package.json

**File**: `packages/sdk/package.json`
**Changes**: Update TypeScript from 5.7.3 to catalog: (viem already uses catalog:)

```json
"devDependencies": {
  "typescript": "catalog:",
}
```

#### 7. Install dependencies

Run `pnpm install` to regenerate the lockfile with all new versions.

### Success Criteria

#### Automated Verification:

- [ ] `pnpm install` completes without errors
- [ ] No peer dependency warnings for wagmi or viem
- [ ] `node -e "console.log(require('./packages/web/node_modules/wagmi/package.json').version)"` outputs `3.4.2`

#### Manual Verification:

- [ ] Check `pnpm-lock.yaml` diff makes sense — only version bumps, no unexpected changes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 2: Fix wagmi v3 Code Changes

### Overview

Update the one file that imports chains from `wagmi/chains` to use `viem/chains` instead, for consistency with the rest of the codebase. Verify no other breaking changes affect our code.

### Changes Required

#### 1. chains.config.ts

**File**: `packages/web/src/app/chains.config.ts`
**Changes**: Change import from `wagmi/chains` to `viem/chains`

```typescript
// Before
import { arbitrum, base, mainnet } from 'wagmi/chains';

// After
import { arbitrum, base, mainnet } from 'viem/chains';
```

This is technically optional (wagmi v3 still re-exports from `wagmi/chains`), but aligns with the rest of the codebase where chains are imported from `viem/chains` directly (e.g., `account.params.tsx:3`, `get-chain-by-id.ts`, `chain-icon.tsx`).

#### 2. Verify no other wagmi v3 breaking changes apply

Search for any usage of:
- `useAccount` (renamed to `useConnection` in v3) — **Not used in our codebase**
- `useAccountEffect` (renamed to `useConnectionEffect`) — **Not used**
- `useSwitchAccount` (renamed to `useSwitchConnection`) — **Not used**
- `useConnect` destructuring `{ connect, connectors }` — **Not used**
- `useSwitchChain` destructuring `{ chains }` — **Not used**
- `useDisconnect` — **Not used**

All confirmed not present. No other code changes needed.

### Success Criteria

#### Automated Verification:

- [ ] `pnpm --filter @wgenie/fusion-web build` succeeds
- [ ] `pnpm --filter @wgenie/fusion-sdk build` succeeds
- [ ] `pnpm --filter @wgenie/fusion-ponder typecheck` succeeds
- [ ] `pnpm --filter @wgenie/fusion-web test:run` passes
- [ ] `pnpm --filter @wgenie/fusion-sdk test` passes

#### Manual Verification:

- [ ] None for this phase — automated builds confirm compatibility

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 3: Update web3-data-fetching Skill

### Overview

Review and update the `web3-data-fetching` skill references to reflect the new wagmi v3 / viem 2.45.1 versions. The skill's core patterns (Fetch → Mapper → Hook) are framework-agnostic and don't change, but version references and any wagmi-specific examples should be updated.

### Changes Required

#### 1. SKILL.md

**File**: `.agents/skills/web3-data-fetching/SKILL.md`
**Changes**: Review for any version-specific references. The skill currently references `readContractQueryOptions` from wagmi — verify this API still exists in wagmi v3. If the function signature changed, update the example.

#### 2. Reference files

**Files**: `.agents/skills/web3-data-fetching/references/*.md`
**Changes**: Review each reference file for wagmi v2-specific patterns that may have changed. Update any version numbers mentioned.

### Success Criteria

#### Automated Verification:

- [ ] No broken code examples in skill files (manual review)

#### Manual Verification:

- [ ] Skill examples are accurate for wagmi 3.4.2 / viem 2.45.1

**Implementation Note**: After completing this phase, pause for manual confirmation before proceeding to the next phase.

---

## Phase 4: End-to-End Verification

### Overview

Run all tests and manually verify the three main packages work correctly.

### Verification Steps

#### Automated Verification:

- [ ] `pnpm --filter @wgenie/fusion-web build` — Next.js production build succeeds
- [ ] `pnpm --filter @wgenie/fusion-web test:run` — Vitest tests pass
- [ ] `pnpm --filter @wgenie/fusion-sdk build && pnpm --filter @wgenie/fusion-sdk test` — SDK builds and tests pass
- [ ] `pnpm --filter @wgenie/fusion-ponder typecheck` — Ponder type checks pass

#### Manual Verification:

- [ ] **Web app**: Run `pnpm dev:web`, navigate to vault list page — verify vault names, TVL, and token icons load
- [ ] **Web app**: Navigate to a vault detail page — verify vault metrics, depositors list, and activity tab work
- [ ] **Web app**: Check that ENS names resolve on depositor addresses
- [ ] **Mastra**: Run `pnpm dev:mastra`, open Mastra Studio, verify plasma vault tools still work (get-vault-info, get-vault-tvl)
- [ ] **Ponder**: Run `pnpm dev:ponder`, verify indexing starts and processes blocks without errors
- [ ] **Storybook** (optional): Run `pnpm --filter @wgenie/fusion-web storybook`, verify components render

**Implementation Note**: This is the final verification phase. After all checks pass, the migration is complete.

---

## Testing Strategy

### Unit Tests

- Web package vitest suite covers component rendering with wagmi hooks
- SDK package vitest suite covers viem utility functions (formatUnits, encodeFunctionData, etc.)

### Integration Tests

- Hardhat tests verify on-chain interactions via viem — `pnpm test:hardhat`

### Manual Testing Steps

1. Open vault list page — data loads from Supabase + RPC
2. Open vault detail page — metrics load via `useReadContract` (convertToAssets)
3. Open depositors list — each row calls `useReadContract` for balanceOf
4. Check token icons — `useReadContract` fetches symbol as fallback
5. Check ENS resolution — `useEnsName` + `useEnsAvatar` on account page

## Performance Considerations

No performance impact expected. The upgrade is a minor version bump for viem (2.31→2.45) and wagmi (2.15→3.4). No new providers, no configuration changes, no additional network requests.

## Migration Notes

- The pnpm override at root level ensures ALL transitive viem dependencies resolve to 2.45.1, preventing version duplication in the lockfile
- Ponder 0.11.x has `peerDependencies: { "viem": ">=2" }` so 2.45.1 is fully compatible
- Hardhat viem plugins (`@nomicfoundation/hardhat-viem`) support viem 2.x — no constraint issues

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0022-migrate-project-to-wagmi-v3.md`
- wagmi v3 migration guide: https://wagmi.sh/react/guides/migrate-from-v2-to-v3
- web3-data-fetching skill: `.agents/skills/web3-data-fetching/SKILL.md`
