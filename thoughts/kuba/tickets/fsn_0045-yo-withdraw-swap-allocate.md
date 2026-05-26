# FSN-0045: YO Treasury — Withdraw, Swap, and Cross-Vault Allocation

Follow-up to FSN-0044 (YO Treasury Foundation). Proves the remaining vault lifecycle operations: withdraw from a YO vault, swap tokens via UniversalTokenSwapperFuse, and deposit into a different YO vault.

## Context from FSN-0044

FSN-0044 created the SDK market module (`packages/sdk/src/markets/yo/`) and a fork test that proves:
- Clone vault via FusionFactory
- Grant roles (ATOMIST, FUSE_MANAGER, ALPHA, WHITELIST)
- Add supply fuses (4 ERC4626 + UniversalTokenSwapper) and balance fuses
- Configure substrates and dependency graphs
- Deposit USDC into vault
- Allocate 50 USDC to yoUSD via `Erc4626SupplyFuse.enter`
- Verify vault holds yoUSD shares worth ~50 USDC

**Test file**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
**Plan file**: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
**Block**: 42755236 on Base fork

## What This Ticket Must Prove

Three operations that FSN-0044 could NOT complete:

### 1. Withdraw from a YO Vault

**Problem discovered in FSN-0044**: The `Erc4626SupplyFuse.exit` function does NOT work with yoUSD.
- The tx succeeds (status: success) but yoUSD shares and USDC balance remain unchanged
- `maxWithdraw` and `maxRedeem` both return valid non-zero values
- `convertToAssets(shares)` correctly returns ~50 USDC
- The enter (deposit) works fine — only exit (withdraw) is broken

**Root cause hypothesis**: Yo Protocol routes all redeems through a **Gateway contract** (`YO_GATEWAY_ADDRESS = 0xF1EeE0957267b1A474323Ff9CfF7719E964969FA`). Direct `withdraw()` calls on YO vaults may be access-controlled or no-ops. The Yo SDK confirms: "All deposits/redeems route through a single Gateway contract" and "redeems can be instant or queued."

**Investigation needed**:
- Check if `yoUSD.withdraw()` requires `msg.sender` to be the Gateway
- Check if there's an allowance/approval needed for the Gateway to move yoUSD shares
- Read the Yo Gateway contract to understand its `redeem` interface
- Check if the `@yo-protocol/core` SDK's `prepareRedeem()` can be used to build a FuseAction
- Alternative: can the PlasmaVault call `yoUSD.redeem(shares, receiver, owner)` directly?
- Alternative: can we use the `UniversalTokenSwapperFuse` to swap yoUSD shares back to USDC?
- Consider if we need a custom fuse or if there's a Yo-specific fuse already deployed

**Skills to use**: `yo-protocol-sdk`, `yo-protocol-cli`, `fuse-explorer`

### 2. Swap Tokens via UniversalTokenSwapperFuse

Prove that the PlasmaVault can swap assets using the UniversalTokenSwapperFuse.

**Test scenario**: Swap some USDC to WETH inside the vault.

**What's needed**:
- Get a swap quote from Odos or KyberSwap API
- Encode `UniversalTokenSwapperFuse.enter()` with the swap calldata
- Execute via `PlasmaVault.execute()`
- Verify WETH balance increased and USDC balance decreased

**Reference**: The UniversalTokenSwapperFuse ABI is already in `packages/ponder/abis/fuses/universal-token-swapper-fuse.abi.ts`. May need to copy relevant parts to the SDK yo module.

**Skills to use**: `fuse-explorer` (to understand the fuse interface), `yo-protocol-cli`

### 3. Deposit to Another YO Vault (yoETH)

After swapping USDC → WETH, prove allocation to yoETH:
- Use `Erc4626SupplyFuse.enter` with slot 2 fuse and yoETH address
- Verify vault holds yoETH shares

**Note**: yoETH underlying is WETH (18 decimals), so the swap must happen first.

## Unresolved Items from FSN-0044

These should be addressed or explicitly deferred:

1. **Factory pre-installs 1 fuse** — after `addFuses([5 fuses])`, `getFuses()` returns 6. The factory installs one fuse during `clone()`. The test uses `greaterThanOrEqual(5)` assertion. Low priority — cosmetic.

2. **Block sensitivity** — Block 35740187 doesn't work (FusionFactory not initialized at that block). Block 42000000 works. The factory is a proxy (328 bytes) that needs initialization. Consider using a very recent block or `latest` for future tests.

3. **SDK address naming** — The SDK exports addresses as `YO_USDC_ADDRESS`, `YO_WETH_ADDRESS` etc. (prefixed with `YO_`). The initial plan used plain `USDC_ADDRESS`, `WETH_ADDRESS`. Current naming is fine but should be consistent.

4. **Multi-chain addresses** — Only Base addresses are configured. Ethereum and Arbitrum addresses not added. Defer unless needed for hackathon demo.

5. **`createChainAddresses()` returns `Address | undefined`** — The `create-vault.ts` library handles this with `requireAddress()` helper. All callers must handle the undefined case.

6. **Yo SDK `depositWithApproval()` is unreliable** — Per Yo SDK docs: "Always use separate `approve()` then `deposit()`". This applies to the Yo Gateway too.

## Approach

Extend the existing fork test at `packages/hardhat-tests/test/yo-treasury/create-vault.ts` with new test cases, or create a second test file. The vault creation + allocation from FSN-0044 becomes the setup, and the new operations build on top.

### Suggested test structure:

```
describe('YO Treasury - withdraw, swap, and cross-vault allocation')
├── before() → create and configure vault (reuse FSN-0044 steps)
├── it('should withdraw from yoUSD back to USDC')
├── it('should swap USDC to WETH via UniversalTokenSwapperFuse')
├── it('should allocate WETH to yoETH')
└── it('should do compound swap+allocate in single execute')
```

## Files to Modify/Create

- `packages/hardhat-tests/test/yo-treasury/create-vault.ts` — extend or create sibling test
- `packages/sdk/src/markets/yo/abi/` — may need UniversalTokenSwapperFuse ABI
- `packages/sdk/src/markets/yo/yo.addresses.ts` — may need new addresses
- `packages/sdk/src/markets/yo/index.ts` — barrel export updates
- `packages/sdk/src/index.ts` — SDK barrel export updates

## Success Criteria

### Automated Verification:
- [ ] Fork test proves withdrawal from yoUSD returns USDC to the vault
- [ ] Fork test proves USDC → WETH swap via UniversalTokenSwapperFuse
- [ ] Fork test proves WETH allocation to yoETH
- [ ] Fork test proves compound swap+allocate in single `execute()` call
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] TypeScript compiles: `cd packages/hardhat-tests && pnpm tsc --noEmit`

### Manual Verification:
- [ ] Test output reviewed — all console.log values make sense
- [ ] No unexpected warnings or errors

## References

- FSN-0044 ticket: `thoughts/kuba/tickets/fsn_0044-yo-implement-.md`
- FSN-0044 plan: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
- Architecture: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Implementation phases: `thoughts/kuba/notes/yo-hackathon/project-plan/03-implementation-phases.md`
- Existing fork test: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- SDK yo module: `packages/sdk/src/markets/yo/`
- Yo Gateway address: `0xF1EeE0957267b1A474323Ff9CfF7719E964969FA` (Base)
- Yo SDK skill: `yo-protocol-sdk` — key info on Gateway pattern and redeem flow
- UniversalTokenSwapperFuse ABI: `packages/ponder/abis/fuses/universal-token-swapper-fuse.abi.ts`
- Odos API: `POST https://api.odos.xyz/sor/quote/v2` and `POST https://api.odos.xyz/sor/assemble`
