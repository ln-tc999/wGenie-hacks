# FSN-0062: Show unallocated asset balances in YO vaults table

## Problem

The "show yo vaults" table lists available YO vaults with TVL, APR, Balance (in that YO vault), and Value columns. But it doesn't show how much of each underlying asset the treasury holds unallocated. After swapping USDC to WETH, the WETH balance is invisible — there's no way to see it in either the treasury overview (only shows the vault's underlying asset) or the vaults table.

The user wants to see all unallocated asset balances alongside the YO vault data so they can make informed allocation decisions (e.g., "I have 0.00006 WETH unallocated, I should allocate it to yoETH").

## Desired End State

The YO vaults table has a new `Unallocated` column showing the treasury's unallocated balance of each vault's underlying asset:

| Vault | TVL | APR | Unallocated | Balance | Value |
|-------|-----|-----|-------------|---------|-------|
| yoETH | $7.1K | 3.24% | 0.00006 WETH | 0 WETH | $0.00 |
| yoUSD | $38.6M | 5.42% | 0.08 USDC | 0 USDC | $0.00 |
| ... | | | | | |

## Changes Required

### 1. Backend: `getYoVaultsTool` (`packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`)

The tool already calls `readYoTreasuryBalances()` when `vaultAddress` is provided. The `snapshot.assets` array contains unallocated ERC20 balances. Currently only `snapshot.yoPositions` is used.

**Change**: Also read `snapshot.assets` and build a map by token address. For each vault in the output, look up the vault's `underlyingAddress` in the assets map and include the unallocated balance.

Add to output schema per vault:
```ts
unallocatedBalance: z.object({
  amount: z.string(),
  formatted: z.string(),
  valueUsd: z.string(),
}).optional(),
```

**Problem to solve**: `readYoTreasuryBalances` currently only discovers the vault's primary underlying asset (via ERC4626 `asset()`) and any tokens in `ERC20_VAULT_BALANCE` substrates. Tokens acquired via swap (e.g., WETH) are NOT discovered because they aren't configured as substrates.

**Fix**: In `readYoTreasuryBalances`, also check the balances of all YO vault underlying assets. The tool already has the list of YO vault addresses from `getVaults()` — pass the underlying asset addresses to `readYoTreasuryBalances` as an optional `additionalTokens` parameter, or do the balance reads in the tool itself after getting the vault list.

Simplest approach: In `getYoVaultsTool`, after getting the vault list, multicall `balanceOf(treasuryAddress)` for each vault's underlying asset address. This avoids changing `readYoTreasuryBalances` at all.

### 2. Frontend: `YoVaultsList` (`packages/web/src/yo-treasury/components/yo-vaults-list.tsx`)

Add `Unallocated` column header and cell between APR and Balance.

### 3. Types: `YoVaultsOutput` (`packages/mastra/src/tools/yo-treasury/types.ts`)

Add `unallocatedBalance` to the vault type.

## Key Files

- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` — tool implementation
- `packages/mastra/src/tools/yo-treasury/read-yo-treasury-balances.ts` — balance reader
- `packages/mastra/src/tools/yo-treasury/types.ts` — type definitions
- `packages/web/src/yo-treasury/components/yo-vaults-list.tsx` — table renderer

## Testing

- Storybook Treasury Tab: "show yo vaults" should show Unallocated column with correct balances
- After swapping USDC to WETH, the WETH unallocated balance should appear in the yoETH row
- Vaults where treasury holds 0 of the underlying should show "0 SYMBOL"
