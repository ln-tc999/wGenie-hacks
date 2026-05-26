# FSN-0046a: Fix SDK `create-vault.ts` Library + Refactor Test

## Overview

The SDK vault creation library (`packages/sdk/src/markets/yo/create-vault.ts`) has three issues discovered during code review: (1) `addBalanceFuses()` doesn't add a ZeroBalanceFuse for the swap market, causing `createAndConfigureVault()` to produce broken vaults, (2) each helper function redundantly creates a new `PlasmaVault` instance (wasting 5 RPC multicalls), and (3) the library has zero test coverage since the fork test does everything inline. This plan fixes the library and refactors the test to use it.

## Current State Analysis

### What exists:
- SDK library at `packages/sdk/src/markets/yo/create-vault.ts` with 7 exported functions
- Fork test at `packages/hardhat-tests/test/yo-treasury/create-vault.ts` — 5 passing tests doing everything inline
- Session notes documenting the ZeroBalanceFuse discovery and handcrafted bytecode workaround

### Key discoveries:
- **`addBalanceFuses()` is broken** — Only adds 4 ERC4626 balance fuses, not the ZeroBalanceFuse for `SWAP_MARKET_ID`. Any vault created via `createAndConfigureVault()` would fail with `AddressEmptyCode(address(0))` when executing swaps. (`create-vault.ts:141-158`)
- **Redundant PlasmaVault instantiation** — Each of `grantRoles()`, `addFuses()`, `addBalanceFuses()`, `configureSubstrates()`, `updateDependencyGraphs()` calls `PlasmaVault.create()` which fires 1 multicall RPC each. `createAndConfigureVault()` thus fires 5 unnecessary multicalls. (`create-vault.ts:100,124,147,173,208`)
- **ZeroBalanceFuse not deployed** — The test works around this with `testClient.setCode()` at a fake address (`0x...AB12CF`). The SDK library can't use this approach. Until deployed (see FSN-0046b), the library must accept an optional address parameter.
- **Test doesn't use library** — All vault creation in the test's `before()` is inline code, so the library's correctness is unvalidated.

## Desired End State

1. `create-vault.ts` functions accept a `PlasmaVault` instance (or create one only when needed), eliminating redundant multicalls
2. `addBalanceFuses()` accepts an optional `zeroBalanceFuseAddress` for the swap market
3. `createAndConfigureVault()` orchestrates the full flow including ZeroBalanceFuse
4. The fork test's `before()` uses the SDK library functions, validating them against a real fork
5. All 5 existing test cases still pass

### Verification:
- Fork test passes: `cd packages/hardhat-tests && pnpm hardhat test test/yo-treasury/create-vault.ts`
- SDK compiles: `cd packages/sdk && pnpm tsc --noEmit`

## What We're NOT Doing

- Deploying ZeroBalanceFuse on-chain (separate plan FSN-0046b)
- Changing the test assertions or adding new test cases
- Removing the handcrafted bytecode hack from the test (it's still needed until deployment)
- Renaming `YO_USDC_ADDRESS` etc. — the `YO_` prefix avoids collision with internal `erc20.addresses.ts`

## Implementation Approach

Two phases: (1) fix the SDK library API, (2) refactor the test's `before()` to call the library. Phase 2 validates Phase 1.

---

## Phase 1: Fix SDK Library

### Overview

Refactor the helper functions to accept a `PlasmaVault` instance, add ZeroBalanceFuse support, and add a `ZERO_BALANCE_FUSE_ADDRESS` placeholder to addresses.

### Changes Required:

#### 1. Add ZeroBalanceFuse address constant

**File**: `packages/sdk/src/markets/yo/yo.addresses.ts` (modify)

Add after the UniversalTokenSwapperFuse section:

```typescript
// ─── ZeroBalanceFuse for Swap Market ───
// Required for PlasmaVault.execute() to work with UniversalTokenSwapperFuse.
// Without this, _updateMarketsBalances() fails with AddressEmptyCode(address(0)).
// TODO: Update with deployed address (see FSN-0046b)
export const ZERO_BALANCE_FUSE_ADDRESS = createChainAddresses({
  // [base.id]: '0x...' — not yet deployed
});
```

Export from `packages/sdk/src/markets/yo/index.ts` and `packages/sdk/src/index.ts`.

#### 2. Refactor `create-vault.ts` — accept PlasmaVault instance

**File**: `packages/sdk/src/markets/yo/create-vault.ts` (modify)

**Change all helper functions** to accept `PlasmaVault` instead of `publicClient + vaultAddress`:

```typescript
/**
 * Grant all YO Treasury roles (ATOMIST, FUSE_MANAGER, ALPHA, WHITELIST) to the owner.
 */
export async function grantRoles(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  ownerAddress: Address,
): Promise<void> {
  const roles = [
    YO_TREASURY_ROLES.ATOMIST,
    YO_TREASURY_ROLES.FUSE_MANAGER,
    YO_TREASURY_ROLES.ALPHA,
    YO_TREASURY_ROLES.WHITELIST,
  ];

  for (const role of roles) {
    await plasmaVault.grantRole(walletClient, role, ownerAddress, 0);
  }
}
```

Apply the same pattern to `addFuses()`, `addBalanceFuses()`, `configureSubstrates()`, `updateDependencyGraphs()`.

**Key change to `addBalanceFuses()`** — accept optional `zeroBalanceFuseAddress`:

```typescript
export async function addBalanceFuses(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  chainId: ChainId,
  options?: { zeroBalanceFuseAddress?: Address },
): Promise<void> {
  const balanceFuses = [
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT1_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT1'), marketId: YO_VAULT_SLOTS.yoUSD.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT2_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT2'), marketId: YO_VAULT_SLOTS.yoETH.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT3_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT3'), marketId: YO_VAULT_SLOTS.yoBTC.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT4_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT4'), marketId: YO_VAULT_SLOTS.yoEUR.marketId },
  ];

  for (const { fuse, marketId } of balanceFuses) {
    await plasmaVault.addBalanceFuse(walletClient, fuse, marketId);
  }

  // Add ZeroBalanceFuse for swap market if address is provided
  const zeroBalanceFuse = options?.zeroBalanceFuseAddress ?? ZERO_BALANCE_FUSE_ADDRESS[chainId];
  if (zeroBalanceFuse) {
    await plasmaVault.addBalanceFuse(walletClient, zeroBalanceFuse, SWAP_MARKET_ID);
  }
}
```

**Key change to `cloneVault()`** — return `PlasmaVault` instance too:

```typescript
export interface VaultCreationResult {
  vaultAddress: Address;
  accessManagerAddress: Address;
  plasmaVault: PlasmaVault;
  txHash: `0x${string}`;
}

export async function cloneVault(
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: YoTreasuryConfig,
): Promise<VaultCreationResult> {
  // ... existing clone logic ...

  const plasmaVault = await PlasmaVault.create(publicClient, result.plasmaVault);

  return {
    vaultAddress: result.plasmaVault,
    accessManagerAddress: result.accessManager,
    plasmaVault,
    txHash,
  };
}
```

**Key change to `createAndConfigureVault()`** — pass PlasmaVault instance through:

```typescript
export interface CreateAndConfigureOptions {
  zeroBalanceFuseAddress?: Address;
}

export async function createAndConfigureVault(
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: YoTreasuryConfig,
  options?: CreateAndConfigureOptions,
): Promise<VaultCreationResult> {
  const result = await cloneVault(publicClient, walletClient, config);
  const { plasmaVault } = result;

  await grantRoles(walletClient, plasmaVault, config.ownerAddress);
  await addFuses(walletClient, plasmaVault, config.chainId);
  await addBalanceFuses(walletClient, plasmaVault, config.chainId, {
    zeroBalanceFuseAddress: options?.zeroBalanceFuseAddress,
  });
  await configureSubstrates(walletClient, plasmaVault, config.chainId);
  await updateDependencyGraphs(walletClient, plasmaVault);

  return result;
}
```

#### 3. Update barrel exports

**File**: `packages/sdk/src/markets/yo/index.ts` (modify)

Add `ZERO_BALANCE_FUSE_ADDRESS` to the addresses export block. Add `type CreateAndConfigureOptions` to the vault creation exports.

**File**: `packages/sdk/src/index.ts` (modify)

Add `ZERO_BALANCE_FUSE_ADDRESS` and `type CreateAndConfigureOptions` to the YO market section.

### Success Criteria:

#### Automated Verification:
- [ ] SDK compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] All new types and exports are importable from `@wgenie/fusion-sdk`

#### Manual Verification:
- [ ] Code review confirms all helper functions accept `PlasmaVault` instance
- [ ] `addBalanceFuses()` handles both provided and missing `zeroBalanceFuseAddress`

**Implementation Note**: Proceed to Phase 2 after TypeScript compiles.

---

## Phase 2: Refactor Test to Use SDK Library

### Overview

Replace inline vault creation code in the test's `before()` with calls to SDK library functions. Keep the ZeroBalanceFuse bytecode hack (needed until deployment). Keep all existing assertions and test cases.

### Changes Required:

#### 1. Refactor test `before()` block

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

**Add SDK library imports** (replace inline imports with library function imports):

```typescript
import {
  PlasmaVault,
  cloneVault,
  grantRoles,
  addFuses,
  addBalanceFuses,
  configureSubstrates,
  updateDependencyGraphs,
  // ABIs still needed for test-specific operations (deposit, allocate, swap, etc.)
  yoErc4626SupplyFuseAbi,
  swapRouter02Abi,
  yoUniversalTokenSwapperFuseAbi,
  // Addresses still needed for test-specific operations
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
  UNISWAP_SWAP_ROUTER_02_ADDRESS,
  SWAP_MARKET_ID,
  YO_TREASURY_ROLES,
  YO_VAULT_SLOTS,
  YO_USD_ADDRESS,
  YO_ETH_ADDRESS,
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
  type VaultCreationResult,
} from '@wgenie/fusion-sdk';
```

**Replace the `before()` block** — use SDK library for vault setup, keep test-specific code (USDC funding, deposit, initial allocation) inline:

```typescript
before(async () => {
  // ... connection setup (unchanged) ...

  // ─── Vault creation via SDK library ───

  const ZERO_BALANCE_FUSE_ADDRESS = '0x0000000000000000000000000000000000AB12CF' as Address;
  await testClient.setCode({
    address: ZERO_BALANCE_FUSE_ADDRESS,
    bytecode: '0x60003560e01c8063454dab2314601d5763722713f714602857600080fd5b600c60005260206000f35b600060005260206000f3',
  });

  // Step 1: Clone vault
  const result = await cloneVault(publicClient, ownerClient, {
    chainId: CHAIN_ID,
    ownerAddress: OWNER_ADDRESS,
    vaultName: 'YO Treasury Test',
    vaultSymbol: 'yoTEST',
  });
  vaultAddress = result.vaultAddress;
  plasmaVault = result.plasmaVault;
  console.log('Vault created:', vaultAddress);

  // Step 2: Grant roles
  await grantRoles(ownerClient, plasmaVault, OWNER_ADDRESS);
  console.log('Roles granted');

  // Step 3: Add supply fuses
  await addFuses(ownerClient, plasmaVault, CHAIN_ID);
  console.log('Fuses added');

  // Step 4: Add balance fuses (including ZeroBalanceFuse for swap market)
  await addBalanceFuses(ownerClient, plasmaVault, CHAIN_ID, {
    zeroBalanceFuseAddress: ZERO_BALANCE_FUSE_ADDRESS,
  });
  console.log('Balance fuses added');

  // Step 5: Configure substrates
  await configureSubstrates(ownerClient, plasmaVault, CHAIN_ID);
  console.log('Substrates configured');

  // Step 6: Update dependency graphs
  await updateDependencyGraphs(ownerClient, plasmaVault);
  console.log('Dependency graphs updated');

  // ─── Test-specific setup (deposit + initial allocation) ───
  // ... USDC funding via storage manipulation (unchanged) ...
  // ... Approve + deposit (unchanged) ...
  // ... Allocate 50 USDC to yoUSD (unchanged) ...
});
```

**Key changes to individual test cases:**
- The **withdraw test** (Phase 1) and **swap test** (Phase 2) currently configure substrates inline (`grantMarketSubstrates` for swap market, yoETH). Since `configureSubstrates()` now does all markets upfront in `before()`, **remove the duplicate substrate configuration** from:
  - The swap test (line 366-372): remove `grantMarketSubstrates` for swap substrates — already done in `before()`
  - The allocate test (line 457-467): remove `grantMarketSubstrates` and `updateDependencyBalanceGraph` for yoETH — already done in `before()`

**Note**: The `plasmaVault` variable type changes from the current inferred type to `PlasmaVault` from the SDK. The `connection.viem` type usage for the variable stays the same — `PlasmaVault` has compatible client types.

### Success Criteria:

#### Automated Verification:
- [ ] Fork test passes: `cd packages/hardhat-tests && pnpm hardhat test test/yo-treasury/create-vault.ts`
- [ ] All 5 test cases still pass with same assertions
- [ ] TypeScript compiles in hardhat-tests: `cd packages/hardhat-tests && pnpm tsc --noEmit`
- [ ] TypeScript compiles in SDK: `cd packages/sdk && pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Console output still shows vault creation progress logs
- [ ] Test execution time hasn't regressed significantly (should be faster with fewer multicalls)

**Implementation Note**: After this phase, the SDK library is validated against a real Base fork. The `createAndConfigureVault()` convenience function is implicitly tested through the individual function calls.

---

## Testing Strategy

### Fork Tests:
- Run existing 5-test suite against Base fork at block 42755236
- Tests validate both the SDK library (via `before()`) and the vault operations (via `it()` blocks)
- The bytecode hack for ZeroBalanceFuse remains until FSN-0046b completes

### Regression:
- Same assertions, same block number, same test structure
- Only the `before()` setup changes from inline to library calls
- Individual tests lose duplicate substrate config (now in library)

## References

- Code review: `thoughts/kuba/tickets/fsn_0046-poc-test-code-review.md`
- Session notes: `thoughts/kuba/notes/yo-hackathon/sessions/testing-poc.md`
- Existing test: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- SDK library: `packages/sdk/src/markets/yo/create-vault.ts`
- PlasmaVault class: `packages/sdk/src/PlasmaVault.ts:60-63`
- ZeroBalanceFuse Solidity: `external/wgenie-fusion/contracts/fuses/ZeroBalanceFuse.sol`
