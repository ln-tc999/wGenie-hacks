# YO Treasury Testing PoC — Session Insights

**Date**: 2026-02-28
**Ticket**: FSN-0045 — YO Treasury: Withdraw, Swap, and Cross-Vault Allocation
**Test file**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`

## What We Built

A full lifecycle test for YO Treasury vaults covering 5 phases:

1. **Initial state** — Clone vault via FusionFactory, deposit USDC, allocate to yoUSD
2. **Withdraw** — Redeem yoUSD shares back to USDC (via impersonation)
3. **Swap** — USDC → WETH via UniversalTokenSwapperFuse + Uniswap V3
4. **Allocate** — WETH → yoETH via ERC4626SupplyFuse (slot 2)
5. **Compound** — Swap + allocate in a single `execute()` call

All 5 tests pass against a Base mainnet fork at block 42755236.

## The Big Bug: `AddressEmptyCode(address(0))`

### Symptom

`PlasmaVault.execute()` reverted with `AddressEmptyCode(address(0))` when running any swap fuse action. Error data: `0x9996b315000...0000`.

### Debugging Journey (Dead Ends)

1. Verified all deployed contracts have code at fork block ✓
2. Verified fuse immutables (EXECUTOR, MARKET_ID, SLIPPAGE_REVERSE) are non-zero ✓
3. Manually decoded ABI calldata byte-by-byte — all 26 words correct ✓
4. Verified PriceOracleMiddleware works ✓
5. Verified substrates configured correctly ✓
6. Tested direct `SwapExecutor.execute()` — works fine ✓

### Breakthrough: Zero-Amount Diagnostic

Tested with `amountIn = 0`. The UniversalTokenSwapperFuse should return early after substrate checks (no actual swap). **It STILL failed with the same error.** This proved the error was NOT in swap logic but in **PlasmaVault's post-execution hooks**.

### Root Cause

After delegatecalling each fuse, `PlasmaVault.execute()` calls `_updateMarketsBalances(markets)`:

```
PlasmaVault.execute()
  → delegatecall fuse.enter()       // ✅ succeeds
  → _updateMarketsBalances(markets)  // 💥 fails here
    → for each touched marketId:
      → balanceFuse = FusesLib.getBalanceFuse(marketId)
      → balanceFuse.functionDelegateCall(...)  // NO zero-address guard!
```

- The swap fuse reports `MARKET_ID = 12` (SWAP_MARKET_ID)
- PlasmaVault records market 12 as "touched"
- `getBalanceFuse(12)` returns `address(0)` because no balance fuse was registered for market 12
- `address(0).functionDelegateCall(...)` → `AddressEmptyCode(address(0))`

The code only checks `if (markets[i] == 0) break` (market ID zero), NOT the balance fuse address.

### Fix: ZeroBalanceFuse

The swap market doesn't hold persistent positions, so its balance is always 0. Solution: register a `ZeroBalanceFuse` for SWAP_MARKET_ID.

Found `external/wgenie-fusion/contracts/fuses/ZeroBalanceFuse.sol` — a simple contract:

```solidity
contract ZeroBalanceFuse is IMarketBalanceFuse {
    uint256 public immutable MARKET_ID;
    constructor(uint256 marketId_) { MARKET_ID = marketId_; }
    function balanceOf() external pure override returns (uint256) { return 0; }
}
```

**In tests**: Used `testClient.setCode()` with handcrafted bytecode (51 bytes):

```typescript
const ZERO_BALANCE_FUSE_ADDRESS = '0x0000000000000000000000000000000000AB12CF' as Address;
await testClient.setCode({
  address: ZERO_BALANCE_FUSE_ADDRESS,
  bytecode:
    '0x60003560e01c8063454dab2314601d5763722713f714602857600080fd5b600c60005260206000f35b600060005260206000f3',
});
await plasmaVault.addBalanceFuse(ownerClient, ZERO_BALANCE_FUSE_ADDRESS, SWAP_MARKET_ID);
```

The bytecode responds to:
- `MARKET_ID()` (selector `0x454dab23`) → returns 12
- `balanceOf()` (selector `0x722713f7`) → returns 0

**Validation constraint**: `FusesLib.addBalanceFuse` checks `marketId_ != IFuseCommon(fuse_).MARKET_ID()` — the fuse's immutable MARKET_ID must match. This is why we can't just use any dummy contract.

**For production**: A real `ZeroBalanceFuse(12)` must be deployed on Base. This is a TODO.

## Key Architecture Insights

### UniversalTokenSwapperFuse Flow

```
PlasmaVault.execute([swapAction])
  → delegatecall UniversalTokenSwapperFuse.enter(data)
    → validates substrates (tokenIn, tokenOut, each target)
    → safeTransfer tokenIn from vault to EXECUTOR
    → calls SwapExecutor.execute(data)
      → for each dex[i]: dex[i].functionCall(dexData[i])
        e.g., USDC.approve(router, amount)
        e.g., router.exactInputSingle({...})
      → sweeps tokenIn + tokenOut back to msg.sender (PlasmaVault)
    → slippage check via PriceOracleMiddleware
```

### Immutables in Delegatecall

The fuse's EXECUTOR, SLIPPAGE_REVERSE, MARKET_ID, VERSION are all `immutable` — stored in bytecode, not storage. They work correctly during delegatecall from PlasmaVault because delegatecall preserves the callee's bytecode while using the caller's storage.

Verified deployed values via `cast call`:
- EXECUTOR = `0x591435c065fce9713c8B112fcBf5Af98b8975cB3`
- MARKET_ID = 12
- SLIPPAGE_REVERSE = `980000000000000000` (0.98e18 = 2% max slippage)

### PlasmaVault.execute() — 2D FuseAction Array

`plasmaVault.execute(walletClient, actions)` takes `FuseAction[][]`:
- Outer array: sequential groups (each triggers `_updateMarketsBalances`)
- Inner array: actions within a group
- SDK's `execute()` calls `.flat()` to flatten to 1D before sending to the contract

For compound operations (swap then allocate), use separate groups: `[[swapAction], [allocateAction]]`.

### YoVault.withdraw() vs redeem()

`withdraw()` is disabled on YO vaults. Must use `redeem()` which delegates to `requestRedeem()`. For small amounts relative to vault TVL, redemption is instant (no delay).

### Uniswap V3 SwapRouter02 on Base

Address: `0x2626664c2603336E57B271c5C0b26F421741e481`

Uses a 7-parameter `exactInputSingle` struct (no `deadline` field — different from SwapRouter01):

```typescript
{
  tokenIn, tokenOut, fee, recipient,
  amountIn, amountOutMinimum, sqrtPriceLimitX96
}
```

The `recipient` should be the SwapExecutor address, NOT the vault. The executor sweeps tokens back to the vault via `msg.sender`.

### USDC Storage Slot for Balance Manipulation

USDC on Base (FiatTokenV2) stores balances at storage slot 9:

```typescript
const balanceSlot = keccak256(
  encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [accountAddress, 9n],
  ),
);
await testClient.setStorageAt({ address: usdcAddress, index: balanceSlot, value: ... });
```

### ERC4626SupplyFuse `enter()` with max uint256

Passing `vaultAssetAmount = type(uint256).max` to `enter()` causes the fuse to use the vault's entire balance of the underlying asset. Useful for "allocate everything" after a swap.

## SDK Changes Made

Added `UNISWAP_SWAP_ROUTER_02_ADDRESS` to swap substrates in `configureSubstrates()` (`packages/sdk/src/markets/yo/create-vault.ts`). Previously only had ODOS and KyberSwap routers.

## Production TODOs

1. **Deploy ZeroBalanceFuse(12)** on Base mainnet for SWAP_MARKET_ID
2. **Update SDK** `addBalanceFuses()` to include ZeroBalanceFuse for swap market once deployed
3. **Withdraw via fuse** — Currently tests use impersonation to call `yoUSD.redeem()`. In production, need an ERC4626SupplyFuse `exit()` action or a dedicated withdraw fuse
4. **Slippage protection** — Tests use `amountOutMinimum: 0` for simplicity. Production must set proper slippage limits
5. **Multi-hop swaps** — Only tested single-hop (USDC/WETH 0.05% pool). May need `exactInput` with encoded path for multi-hop routes
