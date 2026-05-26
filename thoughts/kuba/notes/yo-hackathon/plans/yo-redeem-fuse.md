# Plan: YoRedeemFuse — Fix Withdrawal from YO Vaults

## Context

`Erc4626SupplyFuse.exit()` calls `IERC4626.withdraw()` which is permanently disabled on YoVaults (`Errors.UseRequestRedeem()`). The current fork test works around this by impersonating the PlasmaVault to call `yoVault.redeem()` directly — but that bypasses the fuse system and can't be used in production.

**Fix**: Create a minimal standalone Solidity fuse (`YoRedeemFuse`) that calls `redeem()` instead of `withdraw()`. Deploy it in the fork test, register on PlasmaVault, and prove withdrawal works through the fuse system. Keep `Erc4626SupplyFuse` for deposits (it works fine).

## Approach: Standalone Hardhat-compiled fuse

- **No external Solidity imports** — inline the minimal interfaces (`IFuseCommon`, `IERC4626`) so it compiles standalone
- **Skip `PlasmaVaultConfigLib` substrate validation** — PlasmaVault.execute() already validates fuse registration; substrate checks are an extra safety layer we can skip for hackathon
- **Share-denominated exit** — matches how YoVault.redeem() actually works (takes shares, not assets)
- **Instant-only** — revert with `AsyncRedemptionNotSupported()` if `redeem()` returns 0
- **Compile with Hardhat** (0.8.28) — no Foundry dependency, artifacts auto-generated

## Files

### 1. NEW: `packages/hardhat-tests/contracts/YoRedeemFuse.sol`

Standalone Solidity fuse (~45 lines). Inlines `IFuseCommon` and minimal `IERC4626` interfaces. Single function:

```
exit(YoRedeemFuseExitData { address vault, uint256 shares })
```

Flow:
1. Cap `shares` at `IERC4626(vault).balanceOf(address(this))` (PlasmaVault via delegatecall)
2. Call `IERC4626(vault).redeem(shares, address(this), address(this))`
3. If returns 0 → revert `AsyncRedemptionNotSupported()`
4. Emit `YoRedeemFuseExit(vault, assetsReceived, sharesBurned)`

### 2. NEW: `packages/sdk/src/markets/yo/abi/yo-redeem-fuse.abi.ts`

TypeScript ABI constant for `exit()` function — used by the test (and later by the agent) to encode FuseActions.

### 3. MODIFY: `packages/sdk/src/markets/yo/index.ts`

Add export for the new ABI.

### 4. MODIFY: `packages/sdk/src/index.ts`

Add `yoRedeemFuseAbi` to the YO market exports.

### 5. MODIFY: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`

Changes to the test:

**In `before()` setup** (after vault creation + existing fuse registration):
1. Compile artifact: `import YoRedeemFuseArtifact from '../../artifacts/contracts/YoRedeemFuse.sol/YoRedeemFuse.json'`
2. Deploy: `ownerClient.deployContract({ abi, bytecode, args: [marketId] })`
3. Register: `plasmaVault.addFuses(ownerClient, [fuseAddress])`

**Replace existing impersonation-based withdraw test** with fuse-based test:
```typescript
it('should withdraw from yoUSD via YoRedeemFuse', async () => {
  const yoUsdShares = await publicClient.readContract({ ... balanceOf ... });

  const exitAction = {
    fuse: yoRedeemFuseAddress,
    data: encodeFunctionData({
      abi: yoRedeemFuseAbi,
      functionName: 'exit',
      args: [{ vault: yoUsdAddress, shares: yoUsdShares }],
    }),
  };

  await plasmaVault.execute(ownerClient, [[exitAction]]);

  // Verify: yoUSD shares = 0, USDC returned to vault
});
```

No more impersonation — the fuse runs via delegatecall from PlasmaVault, so `msg.sender = PlasmaVault = share owner`, satisfying YoVault's `owner == msg.sender` check.

## Verification

```bash
# Compile the fuse
cd packages/hardhat-tests && pnpm hardhat compile

# Run tests
cd packages/hardhat-tests && pnpm hardhat test test/yo-treasury/create-vault.ts

# TypeScript checks
cd packages/hardhat-tests && pnpm tsc --noEmit
cd packages/sdk && pnpm tsc --noEmit
```

Expected: All 5 tests pass. The "withdraw from yoUSD" test now uses the fuse instead of impersonation.
