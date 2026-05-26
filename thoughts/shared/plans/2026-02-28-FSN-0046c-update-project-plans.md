# FSN-0046c: Update Obsolete Project Plans

## Overview

The original project plans in `thoughts/kuba/notes/yo-hackathon/project-plan/` were written before implementation. Several assumptions proved wrong during FSN-0044 and FSN-0045. This plan updates the architecture doc, implementation phases, and progress tracker to reflect reality.

## Other instructions

- Create an agent team to explore from different angles
- spawn multiple agents to speed up the work

## Current State Analysis

### What's obsolete:
- **02-architecture.md**: Missing ZeroBalanceFuse requirement, wrong FusionFactory param count, missing Uniswap SwapRouter02, no mention of YoVault.withdraw() being disabled
- **03-implementation-phases.md**: Phase 1 says code lives in `packages/web/src/yo-treasury/` — it actually lives in `packages/sdk/src/markets/yo/` and `packages/hardhat-tests/`
- **05-progress-tracker.md**: Phase 1 items not checked off, doesn't reflect what was actually built

### What's correct and unchanged:
- **00-prd.md**: Product requirements haven't changed
- **01-user-stories.md**: User stories haven't changed
- **04-tech-stack.md**: Tech stack is still accurate

## Desired End State

All three files updated to match the actual implementation. Anyone reading them gets an accurate picture of: what was built, what was discovered, and what remains.

### Verification:
- Read each updated file and confirm it matches the current codebase state

## What We're NOT Doing

- Rewriting the plans from scratch — only updating what's wrong
- Updating 00-prd.md, 01-user-stories.md, or 04-tech-stack.md (they're still accurate)
- Creating new architecture docs for future phases

---

## Phase 1: Update Architecture Doc

### File: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`

### Changes:

#### 1. Per-User Vault Stack — add ZeroBalanceFuse

In the "Installed Fuses" section (around line 66-70), the architecture shows 5 fuses but no balance fuse for the swap market. Add:

```
├── Balance Fuses (one per market, for portfolio tracking)
│   ├── Erc4626BalanceFuse (market ERC4626_0001)
│   ├── Erc4626BalanceFuse (market ERC4626_0002)
│   ├── Erc4626BalanceFuse (market ERC4626_0003)
│   ├── Erc4626BalanceFuse (market ERC4626_0004)
│   └── ZeroBalanceFuse (market UNIVERSAL_TOKEN_SWAPPER = 12)  ← NEW: required!
```

Add a note explaining why:

```
**IMPORTANT**: The ZeroBalanceFuse for the swap market is REQUIRED. After PlasmaVault.execute()
delegatecalls a fuse, it calls _updateMarketsBalances() for each touched market. Without a
balance fuse for market 12, this reverts with AddressEmptyCode(address(0)).
```

#### 2. Contract Addresses — add missing addresses

In the contract addresses table (around line 91-108), add:

| Contract | Address |
|----------|---------|
| **Uniswap V3 SwapRouter02** | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| **SwapExecutor** | `0x591435c065fce9713c8B112fcBf5Af98b8975cB3` |
| **ZeroBalanceFuse(12)** | TBD — see FSN-0046b |

#### 3. Vault Creation Transaction Sequence — fix clone params and add ZeroBalanceFuse step

At line 124, the `clone()` call shows 6 args which is correct for the deployed contract:
```
TX 1: FusionFactory.clone(name, symbol, underlyingToken=USDC, 1, owner, 0)
```
This is already correct. But add a note:

```
Note: The deployed FusionFactory on Base has 6 params (including daoFeePackageIndex).
The local source at external/wgenie-fusion/contracts/factory/FusionFactory.sol has only 5 — it's outdated.
```

Add the ZeroBalanceFuse step after TX 10:
```
TX 10b: PlasmaVault.addBalanceFuse(12n, zeroBalanceFuse)  ← swap market balance fuse
```

#### 4. Add "Known Limitations" section

After the vault creation sequence, add:

```markdown
### Known Limitations (Discovered During Implementation)

1. **YoVault.withdraw() is disabled** — Permanently reverts with `Errors.UseRequestRedeem()`.
   The `Erc4626SupplyFuse.exit()` calls `IERC4626.withdraw()`, hitting this revert.
   Workaround: Call `yoVault.redeem()` directly (delegates to `requestRedeem()`).
   Production fix: Custom fuse that calls `redeem()` instead of `withdraw()`.

2. **YoVault.redeem() requires msg.sender == owner** — The PlasmaVault can only redeem
   if it's the share owner (which it is after allocating). In the test, impersonation is used.
   In production, a custom fuse can delegatecall this correctly.

3. **PriceOracleMiddleware** — The UniversalTokenSwapperFuse checks slippage via the vault's
   price oracle. Factory-cloned vaults come with a PriceManager but it may not have feeds
   configured for all token pairs. This didn't block the POC tests.

4. **Local Solidity source is outdated** — `external/wgenie-fusion/contracts/factory/FusionFactory.sol`
   shows 5 params for `clone()`, but the deployed contract on Base has 6
   (includes `daoFeePackageIndex_`).
```

### Success Criteria:
- [ ] Architecture doc accurately reflects the current on-chain setup
- [ ] ZeroBalanceFuse requirement is documented
- [ ] Known limitations are listed

---

## Phase 2: Update Implementation Phases

### File: `thoughts/kuba/notes/yo-hackathon/project-plan/03-implementation-phases.md`

### Changes:

#### 1. Phase 1 header — mark as DONE with caveats

Add a status banner at the top of Phase 1:

```markdown
## Phase 1: Smart Contract Setup & Vault Creation

> **STATUS: DONE** (FSN-0044, FSN-0045)
> Implemented in `packages/sdk/src/markets/yo/` (not `packages/web/` as originally planned).
> Fork tests at `packages/hardhat-tests/test/yo-treasury/create-vault.ts` — all 5 pass.
> See: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
> See: `thoughts/shared/plans/2026-02-28-FSN-0045-yo-withdraw-swap-allocate.md`
```

#### 2. Phase 1 "Overview" — correct the file location

Replace the overview text at line 31:

```markdown
### Overview
~~Set up the on-chain infrastructure. Create vault creation utilities within `packages/web/src/yo-treasury/`~~

**Actual implementation**: SDK market module at `packages/sdk/src/markets/yo/` with ABIs, address constants, role constants, and vault creation library. Fork tests at `packages/hardhat-tests/test/yo-treasury/`. Constants and ABIs are exported from `@wgenie/fusion-sdk`, not from `packages/web/`.
```

#### 3. Phase 1 success criteria — update status

Update each success criterion with actual status:

```markdown
### Success Criteria (Actual Results)

#### Automated Verification:
- [x] Fork tests pass — 5/5 tests pass on Base fork at block 42755236
- [x] Vault created with correct underlying (USDC) ✓
- [x] All roles granted including WHITELIST_ROLE=800 ✓
- [x] All fuses installed (4 ERC4626Supply + UniversalTokenSwapper) ✓
- [x] Deposit into vault works (100 USDC with WHITELIST_ROLE) ✓
- [x] PlasmaVault.execute with Erc4626SupplyFuse.enter(yoUSD) ✓
- [x] PlasmaVault.execute with UniversalTokenSwapperFuse.enter (USDC→WETH via Uniswap V3) ✓
- [x] Withdrawal from yoUSD via impersonated redeem() ✓ (Erc4626SupplyFuse.exit fails — YoVault.withdraw() is disabled)
- [x] Compound swap+allocate in single execute() call ✓
- [x] TypeScript compiles ✓

#### Issues Found:
- Erc4626SupplyFuse.exit() does NOT work with YO vaults (withdraw() is disabled)
- ZeroBalanceFuse needed for swap market — test uses bytecode hack, production needs deployment
- SDK library functions untested (test does everything inline) — being fixed in FSN-0046a
```

#### 4. Phase 1 "Implementation Order" — update to reflect reality

```markdown
### Implementation Order (Actual)
1. ~~Address constants and ABIs in `packages/web/src/yo-treasury/constants/`~~
   → Implemented in `packages/sdk/src/markets/yo/` as a proper SDK market module
2. ~~Vault creation tx builders in `packages/web/src/yo-treasury/lib/`~~
   → Implemented in `packages/sdk/src/markets/yo/create-vault.ts`
3. Fork tests → `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
4. ✓ Phase 1 complete
```

### Success Criteria:
- [ ] Phase 1 accurately reflects what was built and where
- [ ] Success criteria show actual results including discovered issues

---

## Phase 3: Update Progress Tracker

### File: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`

### Changes:

Update Phase 1 checkboxes to reflect actual completion:

```markdown
## Phase 1: Smart Contract Setup & Vault Creation
- [x] ~~Create `packages/web/src/yo-treasury/constants/addresses.ts`~~ → `packages/sdk/src/markets/yo/yo.addresses.ts`
- [x] ~~Create `packages/web/src/yo-treasury/constants/abis.ts`~~ → `packages/sdk/src/markets/yo/abi/*.abi.ts`
- [x] ~~Create `packages/web/src/yo-treasury/lib/create-vault.ts`~~ → `packages/sdk/src/markets/yo/create-vault.ts`
- [x] Write Hardhat fork tests for vault creation on Base
- [x] Run fork tests — verify vault creation succeeds
- [x] Verify roles granted including WHITELIST_ROLE=800
- [x] Verify fuses installed
- [x] Test deposit into vault (100 USDC — requires WHITELIST_ROLE)
- [x] Test PlasmaVault.execute with Erc4626SupplyFuse.enter(yoUSD)
- [x] Test PlasmaVault.execute with UniversalTokenSwapperFuse.enter (USDC→WETH swap via Uniswap V3)
- [x] ~~Verify Erc4626SupplyFuse.exit(yoUSD) works~~ → **BLOCKED**: YoVault.withdraw() is disabled. Tested via impersonated redeem() instead.
- [x] All fork tests pass (5/5)

### Phase 1 Follow-up (FSN-0046):
- [ ] Fix SDK `create-vault.ts` library (FSN-0046a)
- [ ] Refactor test to use SDK library (FSN-0046a)
- [ ] Deploy ZeroBalanceFuse(12) on Base (FSN-0046b)
- [ ] Update obsolete project plans (FSN-0046c — this task)
```

### Success Criteria:
- [ ] All completed Phase 1 items are checked off
- [ ] Known issues and follow-ups are documented
- [ ] File accurately reflects current project state

---

## References

- Architecture doc: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Implementation phases: `thoughts/kuba/notes/yo-hackathon/project-plan/03-implementation-phases.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- Session notes: `thoughts/kuba/notes/yo-hackathon/sessions/testing-poc.md`
- FSN-0044 plan: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
- FSN-0045 plan: `thoughts/shared/plans/2026-02-28-FSN-0045-yo-withdraw-swap-allocate.md`
