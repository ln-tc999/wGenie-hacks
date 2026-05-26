# FSN-0052: YO Skills Update QA — Fixing Plan

**Status: IMPLEMENTED** (2026-03-06)

## Overview

QA review of the staged yo-treasury agent code against the updated `@yo-protocol/core` v1.0.4+ SDK skills. Fixed 2 issues, confirmed 1 false alarm.

## Key Discovery

**The SDK skill docs are inaccurate about `getVaults()`.** The skill says it returns `VaultConfig[]` (lightweight, no stats), but the installed v1.0.4 SDK's `getVaults()` returns `VaultStatsItem[]` — a rich type with `yield`, `tvl`, `shareAsset`, `contracts`, `asset`, `chain` fields. The original code was correct; no `getVaultSnapshots()` needed.

`VaultStatsItem` is the actual installed type (verified at `node_modules/@yo-protocol/core/dist/api/types.d.ts`):
```typescript
interface VaultStatsItem {
  id: string; name: string; type?: string;
  asset: Asset; shareAsset: Asset;
  chain: { id: number; name: string; ... };
  contracts: { vaultAddress: string; authorityAddress?: string };
  tvl: FormattedValue;
  yield: Yield;  // yield['7d'], yield['1d'], yield['30d']
  sharePrice: FormattedValue;
  cap: FormattedValue;
  ...
}
```

## Changes Made

### 1. `get-yo-vaults.ts` — No change needed (false alarm)
The original code using `client.getVaults()` and accessing `vault.shareAsset.symbol`, `vault.yield['7d']`, `vault.tvl.formatted` etc. was already correct for the installed SDK. The skill docs describe a `VaultConfig` type that doesn't match the actual SDK.

### 2. `read-yo-treasury-balances.ts` — Inlined erc4626Abi
- **Removed**: `import { erc4626Abi } from '@yo-protocol/core'`
- **Added**: Inline 2-function ABI (`asset()`, `convertToAssets()`)
- **Why**: `erc4626Abi` is not documented in the SDK skill — undocumented export risk

### 3. `yo-treasury-agent.ts` — Updated system prompt
- Added Ethereum vault table (yoGOLD, yoUSDT)
- Added Ethereum token addresses (XAUt, USDT)
- Added multi-chain warning
- Updated intro to list all 6 vaults

## Verification

- [x] `cd packages/mastra && pnpm tsc --noEmit` passes
- [x] No `@yo-protocol/core` import in `read-yo-treasury-balances.ts`
- [x] Agent prompt mentions yoGOLD and yoUSDT with addresses and chain info

## References

- Ticket: `thoughts/kuba/tickets/fsn_0052-yo-skills-update-qa.md`
- Previous QA plan: `thoughts/shared/plans/2026-03-06-FSN-0049-yo-treasury-agent-qa.md`
