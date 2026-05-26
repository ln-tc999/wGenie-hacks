# FSN-0046b: Deploy ZeroBalanceFuse on Base

## Overview

Deploy a `ZeroBalanceFuse(12)` contract on Base mainnet for the swap market (`MARKET_ID = 12`). This is required for any PlasmaVault that uses the `UniversalTokenSwapperFuse` — without it, `PlasmaVault.execute()` reverts with `AddressEmptyCode(address(0))` during `_updateMarketsBalances()`. Currently the fork test works around this with handcrafted bytecode at a fake address.

## Current State Analysis

### The problem:
After `PlasmaVault.execute()` delegatecalls a fuse, it calls `_updateMarketsBalances(markets)` which looks up a balance fuse for each touched market. The swap fuse reports `MARKET_ID = 12`. If no balance fuse is registered for market 12, `getBalanceFuse(12)` returns `address(0)`, and `address(0).functionDelegateCall(...)` reverts with `AddressEmptyCode(address(0))`.

### What exists:
- `ZeroBalanceFuse.sol` at `external/wgenie-fusion/contracts/fuses/ZeroBalanceFuse.sol` — simple contract that returns `MARKET_ID()` and `balanceOf() → 0`
- Test workaround using `testClient.setCode()` with 51 bytes of handcrafted bytecode
- `ZERO_BALANCE_FUSE_ADDRESS` placeholder in SDK (added by FSN-0046a, currently empty for all chains)

### Key constraint:
- `FusesLib.addBalanceFuse()` validates that `fuse.MARKET_ID() == marketId_` — the deployed fuse MUST have `MARKET_ID = 12` as an immutable

## Desired End State

1. `ZeroBalanceFuse(12)` deployed and verified on Base mainnet
2. `ZERO_BALANCE_FUSE_ADDRESS` in `yo.addresses.ts` updated with real address
3. SDK `addBalanceFuses()` automatically includes ZeroBalanceFuse (no manual parameter needed)
4. Fork test removes the bytecode hack and uses the real deployed address
5. Fork test block number updated to a block after deployment

### Verification:
- Fork test passes with the real deployed ZeroBalanceFuse address
- `cast call <deployed_address> "MARKET_ID()(uint256)" --rpc-url $RPC_URL_BASE` returns `12`
- `cast call <deployed_address> "balanceOf()(uint256)" --rpc-url $RPC_URL_BASE` returns `0`
- Contract verified on Basescan

## What We're NOT Doing

- Deploying ZeroBalanceFuse on Ethereum or Arbitrum (Base-only for hackathon)
- Deploying any other missing fuses
- Changing the ZeroBalanceFuse contract logic
- Creating a custom withdraw fuse (separate task)

## Implementation Approach

Use Foundry (`forge create`) to deploy the contract from the existing Solidity source. Then update SDK addresses and test.

---

## Phase 1: Deploy Contract

### Overview

Compile and deploy `ZeroBalanceFuse(12)` on Base mainnet using Foundry.

### Steps:

#### 1. Compile the contract

```bash
cd external/wgenie-fusion
forge build --contracts contracts/fuses/ZeroBalanceFuse.sol
```

#### 2. Deploy on Base

```bash
forge create \
  --rpc-url $RPC_URL_BASE \
  --private-key $DEPLOYER_PRIVATE_KEY \
  contracts/fuses/ZeroBalanceFuse.sol:ZeroBalanceFuse \
  --constructor-args 12
```

Record the deployed address.

#### 3. Verify on Basescan

```bash
forge verify-contract \
  --chain base \
  --compiler-version 0.8.26 \
  <DEPLOYED_ADDRESS> \
  contracts/fuses/ZeroBalanceFuse.sol:ZeroBalanceFuse \
  --constructor-args $(cast abi-encode "constructor(uint256)" 12)
```

#### 4. Validate deployment

```bash
cast call <DEPLOYED_ADDRESS> "MARKET_ID()(uint256)" --rpc-url $RPC_URL_BASE
# Expected: 12

cast call <DEPLOYED_ADDRESS> "balanceOf()(uint256)" --rpc-url $RPC_URL_BASE
# Expected: 0
```

### Success Criteria:

#### Automated Verification:
- [ ] `cast call` confirms MARKET_ID = 12 and balanceOf = 0
- [ ] Contract verified on Basescan

#### Manual Verification:
- [ ] Deployment transaction confirmed on Base
- [ ] Source code visible and verified on Basescan

**Implementation Note**: Record the deployed address before proceeding to Phase 2.

---

## Phase 2: Update SDK and Test

### Overview

Update the SDK address constant with the real deployed address. Remove the bytecode hack from the fork test.

### Changes Required:

#### 1. Update address constant

**File**: `packages/sdk/src/markets/yo/yo.addresses.ts` (modify)

```typescript
export const ZERO_BALANCE_FUSE_ADDRESS = createChainAddresses({
  [base.id]: '<DEPLOYED_ADDRESS>',
});
```

#### 2. Remove bytecode hack from test

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

In the `before()` block, remove:
```typescript
// REMOVE: ZeroBalanceFuse bytecode hack
const ZERO_BALANCE_FUSE_ADDRESS = '0x0000000000000000000000000000000000AB12CF' as Address;
await testClient.setCode({
  address: ZERO_BALANCE_FUSE_ADDRESS,
  bytecode: '0x60003560e01c8063454dab2314601d5763722713f714602857600080fd5b600c60005260206000f35b600060005260206000f3',
});
```

And remove the `zeroBalanceFuseAddress` option from the `addBalanceFuses()` call — it now picks up the real address from `ZERO_BALANCE_FUSE_ADDRESS[chainId]` automatically:

```typescript
// Before:
await addBalanceFuses(ownerClient, plasmaVault, CHAIN_ID, {
  zeroBalanceFuseAddress: ZERO_BALANCE_FUSE_ADDRESS,
});

// After:
await addBalanceFuses(ownerClient, plasmaVault, CHAIN_ID);
```

#### 3. Update fork block number

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

Update `BLOCK_NUMBER` to a block after the ZeroBalanceFuse deployment so the contract exists on the fork.

### Success Criteria:

#### Automated Verification:
- [ ] Fork test passes with the real ZeroBalanceFuse (no bytecode hack)
- [ ] SDK compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] Test compiles: `cd packages/hardhat-tests && pnpm tsc --noEmit`

#### Manual Verification:
- [ ] No more `testClient.setCode()` hack in the test
- [ ] `addBalanceFuses()` call in test has no manual `zeroBalanceFuseAddress` parameter

---

## References

- ZeroBalanceFuse Solidity: `external/wgenie-fusion/contracts/fuses/ZeroBalanceFuse.sol`
- Session notes (root cause analysis): `thoughts/kuba/notes/yo-hackathon/sessions/testing-poc.md:19-88`
- SDK address file: `packages/sdk/src/markets/yo/yo.addresses.ts`
- Fork test: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- SDK library: `packages/sdk/src/markets/yo/create-vault.ts`
- FusesLib validation: `addBalanceFuse` checks `fuse.MARKET_ID() == marketId_`
