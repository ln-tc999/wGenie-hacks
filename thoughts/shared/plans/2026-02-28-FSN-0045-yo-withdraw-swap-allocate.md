# FSN-0045: YO Treasury — Withdraw, Swap, and Cross-Vault Allocation

## Overview

Extends the FSN-0044 foundation to prove three remaining vault lifecycle operations: withdraw from a YO vault (yoUSD → USDC), swap tokens via UniversalTokenSwapperFuse (USDC → WETH), and allocate to a different YO vault (WETH → yoETH). All operations are proven via fork tests on Base, building on the existing test at `packages/hardhat-tests/test/yo-treasury/create-vault.ts`.

## Current State Analysis

### What exists (FSN-0044):
- SDK yo market module at `packages/sdk/src/markets/yo/` — ABIs, addresses, constants, vault creation library
- Fork test proving: clone vault → grant roles → add fuses → configure substrates → deposit USDC → allocate to yoUSD
- Vault creation library with step-by-step functions (`cloneVault`, `grantRoles`, `addFuses`, etc.)

### What's broken:
- `Erc4626SupplyFuse.exit()` silently fails on yoUSD — the tx succeeds but no tokens move

### Key Discoveries:

- **YoVault.withdraw() is permanently disabled** — unconditionally reverts with `Errors.UseRequestRedeem()` (`external/core/src/YoVault.sol:286-289`). The `Erc4626SupplyFuse._performWithdraw()` calls `IERC4626.withdraw()` (`external/wgenie-fusion/contracts/fuses/erc4626/Erc4626SupplyFuse.sol:127`), hitting this revert.
- **YoVault.redeem() delegates to requestRedeem()** — `YoVault.sol:291-293`. `requestRedeem()` checks `owner == msg.sender` (`YoVault.sol:146`).
- **The deployed UniversalTokenSwapperFuse is the BASIC variant** (not WithVerification) — confirmed by function selector `0x950ca9fa` in the dispatch table at `0xdBc5f9962CE85749F1b3c51BA0473909229E3807`. Substrates are plain `pad(address)` format, NOT `(selector, target)` packed bytes32.
- **SwapExecutor at `0x591435c065fce9713c8B112fcBf5Af98b8975cB3`** — SLIPPAGE_REVERSE = 0.98e18 (2% max slippage).
- **Uniswap V3 pools exist on Base** — USDC/WETH 0.05% fee pool at `0xd0b53D9277642d899DF5C87A3966A349A798F224`, 0.3% fee pool at `0x6c561B446416E1A00E8E93E221854d6eA4171372` with ample liquidity.
- **Uniswap SwapRouter02 on Base** — `0x2626664c2603336E57B271c5C0b26F421741e481` (verified on-chain, 49K bytecode).
- **For fork tests, pre-encoded DEX calldata is the standard pattern** — no existing Hardhat test calls external APIs. All Foundry swap tests hand-encode Uniswap V3 calldata directly.

## Desired End State

After this plan is complete:
1. Fork test proves withdrawal from yoUSD returns USDC to the vault (via impersonated requestRedeem)
2. Fork test proves USDC → WETH swap via UniversalTokenSwapperFuse with pre-encoded Uniswap V3 calldata
3. Fork test proves WETH allocation to yoETH via Erc4626SupplyFuse
4. Fork test proves compound swap+allocate in a single PlasmaVault.execute() call
5. Root cause of the exit() failure is documented

### Verification:
- Fork test passes: `cd packages/hardhat-tests && pnpm hardhat test test/yo-treasury/create-vault.ts`
- TypeScript compiles: `cd packages/hardhat-tests && pnpm tsc --noEmit`
- TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`

## What We're NOT Doing

- **No custom fuse deployment** — proving requestRedeem works via impersonation is sufficient for hackathon; production fuse is a separate task
- **No Odos/KyberSwap API integration** — using pre-encoded Uniswap V3 calldata for determinism
- **No multi-chain** — Base only
- **No frontend or agent changes** — fork test proof only
- **No async/queued redemption handling** — testing instant redemption path only (small amounts)

## Implementation Approach

Extend the existing fork test file with new test cases. The vault creation from FSN-0044 becomes shared setup. Each new operation gets its own `it()` block. The test file uses a `describe()` with shared `before()` that creates and configures the vault.

---

## Phase 1: Withdraw from yoUSD via requestRedeem

### Overview

Prove that the PlasmaVault can withdraw from yoUSD by calling `yoUSD.redeem()` directly (which delegates to `requestRedeem()`). Since `requestRedeem()` requires `owner == msg.sender`, we impersonate the PlasmaVault address to make the call. This proves the mechanism works and that a custom fuse calling `redeem()` instead of `withdraw()` would solve the problem.

### Changes Required:

#### 1. New test case in existing test file

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

Add a new test case after the existing allocation test. The test reuses the vault state from the first test (vault has yoUSD shares from the 50 USDC allocation).

**Important**: Restructure the describe block so that vault creation + configuration + deposit + allocation happens in `before()`, making the vault state available to all tests.

```typescript
// New test case: withdraw from yoUSD
it('should withdraw from yoUSD via requestRedeem (impersonated)', async () => {
  // Read vault's yoUSD share balance
  const yoUsdShares = await publicClient.readContract({
    address: yoUsdAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(yoUsdShares > 0n).to.equal(true);

  // Record USDC balance before
  const vaultUsdcBefore = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });

  // Impersonate the PlasmaVault to call yoUSD.redeem() directly
  // This proves: msg.sender = PlasmaVault = owner → satisfies requestRedeem check
  await testClient.impersonateAccount({ address: vaultAddress });
  await testClient.setBalance({ address: vaultAddress, value: BigInt(1e18) });

  const vaultWalletClient = await viem.getWalletClient(vaultAddress);

  // Call redeem() which delegates to requestRedeem()
  // For small amounts (50 USDC << vault TVL), this is instant
  await vaultWalletClient.writeContract({
    address: yoUsdAddress,
    abi: erc4626Abi,
    functionName: 'redeem',
    args: [yoUsdShares, vaultAddress, vaultAddress],
  });

  await testClient.stopImpersonatingAccount({ address: vaultAddress });

  // Verify yoUSD shares burned
  const yoUsdSharesAfter = await publicClient.readContract({
    address: yoUsdAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(yoUsdSharesAfter).to.equal(0n);

  // Verify USDC returned to vault
  const vaultUsdcAfter = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(vaultUsdcAfter > vaultUsdcBefore).to.equal(true);
  console.log('Withdrew from yoUSD:', vaultUsdcAfter - vaultUsdcBefore, 'USDC returned');
});
```

### Success Criteria:

#### Automated Verification:
- [ ] yoUSD shares go to 0 after redeem
- [ ] Vault USDC balance increases by ~50 USDC (minus any fees)
- [ ] Transaction does not revert (unlike Erc4626SupplyFuse.exit which calls withdraw())
- [ ] TypeScript compiles

#### Manual Verification:
- [ ] Console output shows reasonable USDC return amount (~49-50 USDC)

**Implementation Note**: After completing this phase, re-allocate USDC to yoUSD (or fund additional USDC) so subsequent phases can work with a vault that has USDC for swapping.

---

## Phase 2: Swap USDC → WETH via UniversalTokenSwapperFuse

### Overview

Prove token swapping through the UniversalTokenSwapperFuse using pre-encoded Uniswap V3 `exactInputSingle` calldata via SwapRouter02 on Base. No external API calls — fully deterministic.

### Changes Required:

#### 1. Add SwapRouter02 ABI (minimal)

**File**: `packages/sdk/src/markets/yo/abi/swap-router-02.abi.ts` (new)

Only the `exactInputSingle` function needed for the test:

```typescript
import { Abi } from 'viem';

export const swapRouter02Abi = [
  {
    type: 'function',
    name: 'exactInputSingle',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        components: [
          { name: 'tokenIn', type: 'address', internalType: 'address' },
          { name: 'tokenOut', type: 'address', internalType: 'address' },
          { name: 'fee', type: 'uint24', internalType: 'uint24' },
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256', internalType: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'payable',
  },
] as const satisfies Abi;
```

#### 2. Add addresses and exports

**File**: `packages/sdk/src/markets/yo/yo.addresses.ts` (modify — add)

```typescript
// ─── Uniswap V3 SwapRouter02 (for pre-encoded swap calldata) ───
export const UNISWAP_SWAP_ROUTER_02_ADDRESS = createChainAddresses({
  [base.id]: '0x2626664c2603336E57B271c5C0b26F421741e481',
});
```

**File**: `packages/sdk/src/markets/yo/index.ts` (modify — add export)

```typescript
export { swapRouter02Abi } from './abi/swap-router-02.abi';
```

Add `UNISWAP_SWAP_ROUTER_02_ADDRESS` to the addresses export block and `swapRouter02Abi` to the ABIs section.

**File**: `packages/sdk/src/index.ts` (modify — add to YO section)

Add `swapRouter02Abi` and `UNISWAP_SWAP_ROUTER_02_ADDRESS` to the YO market exports.

#### 3. Add UniversalTokenSwapperFuse ABI to SDK yo module

**File**: `packages/sdk/src/markets/yo/abi/universal-token-swapper-fuse.abi.ts` (new)

Copy the `enter` function from `packages/ponder/abis/fuses/universal-token-swapper-fuse.abi.ts` (the basic variant). Only need the `enter` function:

```typescript
import { Abi } from 'viem';

export const universalTokenSwapperFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct UniversalTokenSwapperEnterData',
        components: [
          { name: 'tokenIn', type: 'address', internalType: 'address' },
          { name: 'tokenOut', type: 'address', internalType: 'address' },
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          {
            name: 'data',
            type: 'tuple',
            internalType: 'struct UniversalTokenSwapperData',
            components: [
              { name: 'targets', type: 'address[]', internalType: 'address[]' },
              { name: 'data', type: 'bytes[]', internalType: 'bytes[]' },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

Export from `index.ts` as `yoUniversalTokenSwapperFuseAbi`.

#### 4. New test case for swap

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

The swap test requires configuring the swap market substrates (USDC, WETH, SwapRouter02) and encoding the Uniswap V3 calldata.

```typescript
it('should swap USDC to WETH via UniversalTokenSwapperFuse', async () => {
  const swapRouter02Address = UNISWAP_SWAP_ROUTER_02_ADDRESS[CHAIN_ID];
  const wethAddress = YO_WETH_ADDRESS[CHAIN_ID];
  const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[CHAIN_ID];
  const swapAmount = 10_000000n; // 10 USDC

  // ─── Configure swap substrates ───
  // Need: USDC (tokenIn), WETH (tokenOut), SwapRouter02 (target)
  const swapSubstrates = [
    pad(usdcAddress, { size: 32 }).toLowerCase() as Hex,
    pad(wethAddress, { size: 32 }).toLowerCase() as Hex,
    pad(swapRouter02Address, { size: 32 }).toLowerCase() as Hex,
  ];
  await plasmaVault.grantMarketSubstrates(ownerClient, SWAP_MARKET_ID, swapSubstrates);

  // ─── Encode swap calldata ───
  // Step 1: USDC.approve(SwapRouter02, amount) — executor approves router
  // Step 2: SwapRouter02.exactInputSingle({...}) — router pulls USDC, sends WETH

  const EXECUTOR_ADDRESS = '0x591435c065fce9713c8B112fcBf5Af98b8975cB3' as Address;

  const targets: Address[] = [usdcAddress, swapRouter02Address];
  const swapData: Hex[] = [
    encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [swapRouter02Address, swapAmount],
    }),
    encodeFunctionData({
      abi: swapRouter02Abi,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: usdcAddress,
        tokenOut: wethAddress,
        fee: 500,  // 0.05% pool
        recipient: EXECUTOR_ADDRESS,  // executor receives WETH, sweeps back to vault
        amountIn: swapAmount,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      }],
    }),
  ];

  // ─── Build FuseAction ───
  const swapAction = {
    fuse: swapFuseAddress,
    data: encodeFunctionData({
      abi: yoUniversalTokenSwapperFuseAbi,
      functionName: 'enter',
      args: [{
        tokenIn: usdcAddress,
        tokenOut: wethAddress,
        amountIn: swapAmount,
        data: { targets, data: swapData },
      }],
    }),
  };

  // Record balances before
  const vaultUsdcBefore = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });

  // ─── Execute swap ───
  await plasmaVault.execute(ownerClient, [[swapAction]]);

  // Verify USDC decreased
  const vaultUsdcAfter = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(vaultUsdcAfter).to.equal(vaultUsdcBefore - swapAmount);

  // Verify WETH received
  const vaultWethBalance = await publicClient.readContract({
    address: wethAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(vaultWethBalance > 0n).to.equal(true);
  console.log('Swapped', swapAmount, 'USDC →', vaultWethBalance, 'WETH');
});
```

**Key details:**
- SwapRouter02's `exactInputSingle()` pulls tokens from `msg.sender` (the SwapExecutor), so the executor must first approve the router
- The `recipient` is set to the SwapExecutor address so WETH goes to the executor, which then sweeps it back to the PlasmaVault
- Fee tier 500 (0.05%) is the most liquid USDC/WETH pool on Base
- `amountOutMinimum: 0n` is acceptable for fork tests but not production
- The fuse's slippage check (2% max) provides additional protection

**Potential issue: PriceOracleMiddleware** — The fuse checks slippage via the vault's price oracle. If the newly-cloned vault doesn't have a price oracle configured for USDC and WETH, this check might fail. In that case, we may need to skip the slippage check or configure a price oracle. This should be investigated during implementation — if the slippage check reverts, try:
1. Check if the factory pre-configures a price oracle
2. If not, check if slippage check is skipped when no oracle exists
3. As a last resort, use the `instantWithdraw` path which catches exceptions

### Success Criteria:

#### Automated Verification:
- [ ] Vault USDC balance decreases by exactly 10 USDC
- [ ] Vault WETH balance increases to > 0
- [ ] Transaction does not revert
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] TypeScript compiles: `cd packages/hardhat-tests && pnpm tsc --noEmit`

#### Manual Verification:
- [ ] Console output shows reasonable WETH amount for 10 USDC (at current prices, roughly 0.003-0.004 WETH)
- [ ] No slippage-related errors

**Implementation Note**: If the PriceOracleMiddleware is not configured and causes a revert, document the issue and investigate. The swap mechanism itself is proven by the calldata encoding — the oracle issue is vault configuration, not the swap fuse.

---

## Phase 3: Allocate WETH to yoETH

### Overview

After swapping USDC → WETH, allocate the received WETH to yoETH using `Erc4626SupplyFuse.enter()` with the slot 2 fuse. This proves cross-asset vault allocation.

### Changes Required:

#### 1. New test case

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

```typescript
it('should allocate WETH to yoETH', async () => {
  const yoEthAddress = YO_ETH_ADDRESS[CHAIN_ID];
  const wethAddress = YO_WETH_ADDRESS[CHAIN_ID];
  const supplyFuseSlot2 = ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS[CHAIN_ID];

  // ─── Configure yoETH substrate + dependency graph ───
  // (Only if not already configured in before() setup)
  const yoEthSubstrate = pad(yoEthAddress, { size: 32 }).toLowerCase() as Hex;
  await plasmaVault.grantMarketSubstrates(
    ownerClient,
    YO_VAULT_SLOTS.yoETH.marketId,
    [yoEthSubstrate],
  );
  await plasmaVault.updateDependencyBalanceGraph(
    ownerClient,
    YO_VAULT_SLOTS.yoETH.marketId,
    [],
  );

  // Read available WETH
  const wethBalance = await publicClient.readContract({
    address: wethAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(wethBalance > 0n).to.equal(true);

  // ─── Allocate all WETH to yoETH ───
  const enterAction = {
    fuse: supplyFuseSlot2,
    data: encodeFunctionData({
      abi: yoErc4626SupplyFuseAbi,
      functionName: 'enter',
      args: [{ vault: yoEthAddress, vaultAssetAmount: wethBalance }],
    }),
  };

  await plasmaVault.execute(ownerClient, [[enterAction]]);

  // Verify yoETH shares > 0
  const yoEthShares = await publicClient.readContract({
    address: yoEthAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(yoEthShares > 0n).to.equal(true);

  // Verify WETH balance is 0 (all allocated)
  const wethAfter = await publicClient.readContract({
    address: wethAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(wethAfter).to.equal(0n);

  console.log('Allocated', wethBalance, 'WETH → yoETH shares:', yoEthShares);
});
```

### Success Criteria:

#### Automated Verification:
- [ ] yoETH shares > 0 in vault balance
- [ ] WETH balance goes to 0 (all allocated)
- [ ] Transaction does not revert

#### Manual Verification:
- [ ] Console output shows yoETH shares are non-zero and proportional to WETH input

---

## Phase 4: Compound Swap + Allocate in Single Execute

### Overview

Prove that swap and allocation can be composed atomically in a single `PlasmaVault.execute()` call. This is the most powerful pattern — the AI agent will use this to execute "Swap USDC to WETH and allocate to yoETH" in one transaction.

### Changes Required:

#### 1. New test case

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (modify)

This test needs fresh USDC in the vault (either from a re-deposit or using the remaining USDC after prior tests).

```typescript
it('should compound swap+allocate in single execute', async () => {
  const swapRouter02Address = UNISWAP_SWAP_ROUTER_02_ADDRESS[CHAIN_ID];
  const wethAddress = YO_WETH_ADDRESS[CHAIN_ID];
  const yoEthAddress = YO_ETH_ADDRESS[CHAIN_ID];
  const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[CHAIN_ID];
  const supplyFuseSlot2 = ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS[CHAIN_ID];
  const EXECUTOR_ADDRESS = '0x591435c065fce9713c8B112fcBf5Af98b8975cB3' as Address;

  // Use remaining USDC in vault
  const vaultUsdc = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(vaultUsdc > 0n).to.equal(true);
  const swapAmount = vaultUsdc; // swap all remaining USDC

  // ─── Action 1: Swap USDC → WETH ───
  const swapAction = {
    fuse: swapFuseAddress,
    data: encodeFunctionData({
      abi: yoUniversalTokenSwapperFuseAbi,
      functionName: 'enter',
      args: [{
        tokenIn: usdcAddress,
        tokenOut: wethAddress,
        amountIn: swapAmount,
        data: {
          targets: [usdcAddress, swapRouter02Address],
          data: [
            encodeFunctionData({
              abi: erc20Abi,
              functionName: 'approve',
              args: [swapRouter02Address, swapAmount],
            }),
            encodeFunctionData({
              abi: swapRouter02Abi,
              functionName: 'exactInputSingle',
              args: [{
                tokenIn: usdcAddress,
                tokenOut: wethAddress,
                fee: 500,
                recipient: EXECUTOR_ADDRESS,
                amountIn: swapAmount,
                amountOutMinimum: 0n,
                sqrtPriceLimitX96: 0n,
              }],
            }),
          ],
        },
      }],
    }),
  };

  // ─── Action 2: Allocate ALL WETH to yoETH ───
  // Note: We use type(uint256).max as amount — the Erc4626SupplyFuse.enter()
  // caps at available balance via IERC4626.deposit(amount, vault). If the vault
  // has less WETH than requested, it deposits what's available.
  // Actually, we need to use the exact WETH amount. Since we don't know it
  // at encoding time, we use a very large number and the ERC4626 deposit
  // will use maxDeposit. OR we can just use two separate execute calls.
  //
  // Alternative: compose as two actions in the same execute() call.
  // The swap completes first, depositing WETH into the vault.
  // Then the allocation action runs, using the WETH that's now in the vault.

  // For the allocation, we'll use a large amount — the fuse caps at available balance
  const allocateAction = {
    fuse: supplyFuseSlot2,
    data: encodeFunctionData({
      abi: yoErc4626SupplyFuseAbi,
      functionName: 'enter',
      args: [{
        vault: yoEthAddress,
        vaultAssetAmount: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'), // max uint256
      }],
    }),
  };

  // ─── Execute both actions atomically ───
  // Each FuseAction[] in the outer array runs sequentially
  await plasmaVault.execute(ownerClient, [[swapAction], [allocateAction]]);

  // Verify: no USDC remaining
  const usdcAfter = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(usdcAfter).to.equal(0n);

  // Verify: no WETH remaining (all went to yoETH)
  const wethAfter = await publicClient.readContract({
    address: wethAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(wethAfter).to.equal(0n);

  // Verify: yoETH shares increased
  const yoEthShares = await publicClient.readContract({
    address: yoEthAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });
  expect(yoEthShares > 0n).to.equal(true);

  console.log('Compound swap+allocate:', swapAmount, 'USDC → yoETH shares:', yoEthShares);
});
```

**Design note on PlasmaVault.execute() structure**: `execute(FuseAction[][])` — the outer array is sequential batches, the inner array is parallel actions within a batch. Swap must complete before allocation, so they go in separate batches: `[[swapAction], [allocateAction]]`.

**Design note on max uint256 for allocation amount**: The `Erc4626SupplyFuse.enter()` calls `IERC4626.deposit(amount, vault)`. The ERC4626 vault's `deposit()` should handle amounts > available balance by using `maxDeposit()`. If this doesn't work, the test will need to be split into two separate `execute()` calls: one for swap, one for allocation with the actual WETH amount.

### Success Criteria:

#### Automated Verification:
- [ ] Single `PlasmaVault.execute()` call succeeds with both actions
- [ ] USDC balance = 0 (all swapped)
- [ ] WETH balance = 0 (all allocated)
- [ ] yoETH shares > 0
- [ ] Transaction does not revert

#### Manual Verification:
- [ ] Console output shows complete USDC → yoETH flow with reasonable values
- [ ] Review that the compound pattern would work for the AI agent

**Implementation Note**: If using `type(uint256).max` for the allocation amount causes issues, split into two approaches:
1. Two separate `execute()` calls (read WETH balance between them)
2. Or use a hardcoded WETH estimate with some buffer

After this phase, the full vault lifecycle is proven: create → configure → deposit → allocate → withdraw → swap → cross-allocate → compound.

---

## Test File Restructuring

The existing test has a single `it()` block for everything. To support multiple test cases sharing vault state, restructure to:

```
describe('YO Treasury - vault creation and allocation lifecycle', { timeout: 120_000 })
├── let vaultAddress, plasmaVault, ownerClient, publicClient, testClient (shared state)
├── before() → network.connect + create vault + configure + deposit + allocate to yoUSD
├── after() → connection.close()
├── it('should have vault with yoUSD allocation') → verify initial state assertions
├── it('should withdraw from yoUSD via requestRedeem') → Phase 1
├── it('should swap USDC to WETH via UniversalTokenSwapperFuse') → Phase 2
├── it('should allocate WETH to yoETH') → Phase 3
└── it('should compound swap+allocate in single execute') → Phase 4
```

**Important**: Tests run sequentially and share state. Each test modifies vault balances, so order matters. The tests must run in declaration order.

After the withdraw test (Phase 1), the vault needs USDC re-funded for swap tests. Options:
- The withdraw returns ~50 USDC, plus the vault already has 50 USDC from the initial deposit (100 deposited, 50 allocated to yoUSD)
- So after withdraw: vault has ~100 USDC total
- Phase 2 swap uses 10 USDC → leaves ~90 USDC
- Phase 3 uses the WETH from Phase 2's swap
- Phase 4 uses remaining USDC for compound test

This flow works without additional USDC funding.

---

## New Files Summary

```
packages/sdk/src/markets/yo/abi/
├── swap-router-02.abi.ts                    # NEW: Uniswap V3 SwapRouter02 ABI (minimal)
└── universal-token-swapper-fuse.abi.ts      # NEW: Basic variant enter() ABI
```

## Modified Files Summary

```
packages/sdk/src/markets/yo/yo.addresses.ts  # ADD: UNISWAP_SWAP_ROUTER_02_ADDRESS
packages/sdk/src/markets/yo/index.ts         # ADD: new ABI + address exports
packages/sdk/src/index.ts                    # ADD: new exports to SDK barrel
packages/hardhat-tests/test/yo-treasury/create-vault.ts  # RESTRUCTURE + ADD: 4 new test cases
```

## Testing Strategy

### Fork Tests:
- All tests run on a single Base fork at block 42755236
- Sequential execution — tests share vault state
- Each test builds on the previous one's state changes
- Timeout: 120s for the full suite

### Key Assertions:
- Balance changes are exact (not approximate) for USDC transfers
- yoUSD/yoETH share balances use `> 0` assertions (share price varies)
- Swap output uses `> 0` assertion (exact WETH amount depends on pool state)

### What's NOT tested:
- Odos/KyberSwap API integration (separate task)
- Queued/async redemption (large amounts)
- Custom fuse deployment
- Multi-chain
- Frontend/agent integration

## Performance Considerations

- Fork test timeout may need increase to 180s with 4 additional test cases (16+ transactions)
- Each test case adds ~5-10 on-chain transactions
- Uniswap V3 swap calldata is compact — no performance concerns
- The price oracle middleware query during slippage check adds ~1 extra RPC call

## Open Questions / Risks

1. **PriceOracleMiddleware**: The UniversalTokenSwapperFuse checks slippage via the vault's price oracle. If the newly-cloned vault doesn't have an oracle configured for USDC/WETH, the swap will revert. Mitigation: investigate during implementation, may need to configure a price oracle or test without slippage protection.

2. **ERC4626 deposit with max uint256**: For the compound test, using `type(uint256).max` as the allocation amount might not be handled gracefully by the `Erc4626SupplyFuse.enter()` or yoETH's `deposit()`. Mitigation: split into two execute() calls if needed.

3. **Block sensitivity for swap**: The USDC/WETH pool state at block 42755236 might have different liquidity than current. The swap should still work for 10 USDC (tiny amount), but the output WETH amount may differ from current prices.

## References

- FSN-0044 plan: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
- FSN-0045 ticket: `thoughts/kuba/tickets/fsn_0045-yo-withdraw-swap-allocate.md`
- Architecture: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Existing test: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- SDK yo module: `packages/sdk/src/markets/yo/`
- YoVault source: `external/core/src/YoVault.sol` — `withdraw()` at line 286, `redeem()` at line 291
- YoGateway source: `external/core/src/YoGateway.sol` — `redeem()` at line 72
- Erc4626SupplyFuse source: `external/wgenie-fusion/contracts/fuses/erc4626/Erc4626SupplyFuse.sol` — `_performWithdraw()` at line 116
- UniversalTokenSwapperFuse source: `external/wgenie-fusion/contracts/fuses/universal_token_swapper/UniversalTokenSwapperFuse.sol`
- SwapExecutor source: `external/wgenie-fusion/contracts/fuses/universal_token_swapper/SwapExecutor.sol`
- Foundry swap test: `external/wgenie-fusion/test/fuses/universal_token_swapper/UniversalSwapOnUniswapV3SwapFuseTest.t.sol`
- Uniswap V3 SwapRouter02 on Base: `0x2626664c2603336E57B271c5C0b26F421741e481`
- USDC/WETH pool (0.05% fee) on Base: `0xd0b53D9277642d899DF5C87A3966A349A798F224`
- SwapExecutor on Base: `0x591435c065fce9713c8B112fcBf5Af98b8975cB3`
