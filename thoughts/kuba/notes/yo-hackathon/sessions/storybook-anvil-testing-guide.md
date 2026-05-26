# Storybook on Anvil Fork — Testing Guide

**Ticket**: FSN-0056
**Plan**: `thoughts/shared/plans/2026-03-08-FSN-0056-storybook-anvil-fork.md`

## Quick Start

```bash
cd packages/web

# Normal storybook (real RPCs, as before)
pnpm sb

# Storybook on Anvil fork (no real money spent)
pnpm sb:anvil
```

## Prerequisites

- **Foundry installed** (`anvil` binary on PATH)
  - Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **RPC URLs configured** in `packages/web/.env`:
  - `NEXT_PUBLIC_RPC_URL_MAINNET`
  - `NEXT_PUBLIC_RPC_URL_ARBITRUM`
  - `NEXT_PUBLIC_RPC_URL_BASE`
- **Test private key** in `packages/web/.env`:
  - `ALPHA_CONFIG_TEST_PRIVATE_KEY`

## What Anvil Mode Does

1. Spawns 3 Anvil fork processes (mainnet, arbitrum, base) using RPC URLs from `.env`
2. Redirects all storybook RPC traffic to local Anvil instances
3. Funds the test wallet (`0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`) with:
   - 100 ETH (gas) on Base fork
   - 10,000 USDC on Base fork (via whale impersonation)
4. Kills Anvil processes when storybook stops

## Playwright MCP Testing Scenarios

### Setup

1. Start storybook in anvil mode: `pnpm sb:anvil`
2. Wait for console output showing all 3 forks ready
3. Open Playwright MCP

### Scenario 1: Deposit USDC into Treasury Vault

**URL**: `http://localhost:6007/?path=/story/yo-treasury-deposit-form--base`

**Steps**:
1. `browser_navigate` to the URL
2. `browser_snapshot` — verify wallet connected, USDC balance visible (~10,000)
3. Find the amount input, `browser_fill_form` with "100"
4. `browser_click` the Approve button
5. Wait ~5s for Anvil tx, `browser_snapshot` — verify approval succeeded
6. `browser_click` the Deposit button
7. Wait ~5s for Anvil tx, `browser_snapshot` — verify deposit succeeded
8. Verify USDC balance decreased, vault shares received

**Expected**: All transactions succeed on Anvil fork. No real USDC spent.

### Scenario 2: Withdraw from Treasury Vault

**URL**: `http://localhost:6007/?path=/story/yo-treasury-withdraw-form--base`

**Steps**:
1. `browser_navigate` to the URL
2. `browser_snapshot` — verify wallet connected, share balance visible (from Scenario 1 or existing shares at fork block)
3. Enter withdrawal amount via `browser_fill_form`
4. `browser_click` the Redeem button
5. Wait ~5s for Anvil tx
6. `browser_snapshot` — verify redemption succeeded, USDC returned

**Expected**: Redeem tx succeeds on Anvil fork.

**Note**: Run Scenario 1 first so the test wallet has vault shares, or ensure the demo vault (`0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`) already has shares for the test wallet at the fork block.

### Scenario 3: Create Treasury Vault

**URL**: `http://localhost:6007/?path=/story/yo-treasury-create-treasury-vault--default`

**Steps**:
1. `browser_navigate` to the URL
2. `browser_snapshot` — verify wallet connected, on Base chain
3. For each step (Clone, Grant Roles, Add Fuses, Add Balance Fuses, Configure Substrates, Update Deps):
   - `browser_click` the step's action button
   - Wait ~5s for Anvil tx
   - `browser_snapshot` — verify step completed (checkmark shown)
4. Final `browser_snapshot` — verify "Vault created and fully configured!"

**Expected**: All 6 on-chain transactions succeed on Anvil. New vault address shown.

### Full Lifecycle (not fully testable via UI)

The complete treasury flow is: **deposit USDC → allocate to yoUSD → withdraw from yoUSD → withdraw from treasury**. Scenarios 1 and 2 cover the UI-facing parts (deposit/withdraw from treasury). The middle steps (allocate to yoUSD, withdraw from yoUSD) are agent-driven actions via `PlasmaVault.execute()` and are not exposed in the UI — they're only testable via the agent chat or POC test (`packages/hardhat-tests/test/yo-treasury/create-vault.ts`).

Allocating to other YO vaults (yoETH, yoBTC, yoEUR) requires their respective underlying assets (WETH, cbBTC, EURC). This could be achieved by swapping USDC via Uniswap V3 smart contracts (as done in the POC test), but there's no swap UI in the treasury app.

## Verifying No Real Money Was Spent

After testing, confirm the test wallet's real balances are unchanged:

```bash
# Check real USDC balance on Base (should be unchanged)
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)(uint256)" \
  0x35b4915b0fCA6097167fAa8340D3af3E51AA3841 \
  --rpc-url $NEXT_PUBLIC_RPC_URL_BASE

# Check real ETH balance on Base (should be unchanged)
cast balance 0x35b4915b0fCA6097167fAa8340D3af3E51AA3841 \
  --rpc-url $NEXT_PUBLIC_RPC_URL_BASE
```

## Troubleshooting

### `anvil` not found
```
Error: ❌ `anvil` not found. Install Foundry...
```
Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Anvil fork fails to start
- Check that RPC URLs in `.env` are valid and accessible
- Check that the RPC provider allows forking (some free tiers block `debug_traceCall`)
- Try running manually: `anvil --fork-url $NEXT_PUBLIC_RPC_URL_BASE --port 8545`

### USDC whale transfer fails
- The hardcoded whale address may not have sufficient USDC at the current fork block
- Update `BASE_USDC_WHALE` in `.storybook/anvil-forks.ts`
- Alternative: use storage slot manipulation (see `known-issues.md` for USDC slot 9 pattern)

### Orphaned Anvil processes after crash
```bash
# Find and kill any lingering anvil processes
ps aux | grep anvil | grep -v grep
pkill -f "anvil --fork-url"
```

### Transactions slow on Anvil
- Anvil forks are started with `--no-rate-limit` for max throughput
- If still slow, check upstream RPC latency (Anvil fetches missing state on-demand)
- Consider pinning to a specific block: add `--fork-block-number <N>` for deterministic state

## Limitations of Anvil Fork Approach

Anvil forks only simulate the blockchain (EVM state). Any feature that depends on **external APIs or off-chain services** will NOT work correctly on a fork:

- **Swap aggregators (Odos, KyberSwap, 1inch)** — These APIs quote routes and build calldata against real chain state. The Anvil fork state diverges from mainnet the moment we fund the wallet or execute transactions, so aggregator quotes may reference stale liquidity or fail outright.
- **Yo Protocol hooks (`@yo-protocol/react`, `@yo-protocol/core`)** — Hooks like `useVaultSnapshot`, `useVaultYieldHistory`, `useUserPerformance`, `useMerklRewards` etc. fetch data from the **Yo REST API**, not from on-chain reads. The REST API reflects real chain state, not the Anvil fork. Depositing on a fork won't update Yo API responses.
- **Subgraphs / indexers** — Any UI that reads from The Graph, Ponder, or other indexers will show real chain data, not fork state.
- **Oracle price feeds** — External oracle APIs (e.g., Chainlink off-chain feeds, Pyth) won't reflect fork-side price changes.

**What DOES work on Anvil fork**: Pure smart contract interactions — deposits, withdrawals, approvals, vault creation, fuse execution, role grants — anything that only reads/writes EVM state via RPC calls (`eth_call`, `eth_sendTransaction`, `eth_getBalance`, etc.).

**Practical impact**: Stories that only do on-chain transactions (deposit form, withdraw form, create vault) work perfectly. Stories or features that also call external APIs will show a mix of fork state (balances, tx results) and real state (API data, quotes).

## Key Addresses

| Item | Address |
|------|---------|
| Test wallet | `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841` |
| Demo vault (Base) | `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` |
| USDC (Base) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Storybook URL | `http://localhost:6007` |

## Files Modified

- `packages/web/.storybook/anvil-forks.ts` — Anvil lifecycle & wallet funding
- `packages/web/.storybook/main.ts` — Conditional Anvil integration
- `packages/web/package.json` — `sb:anvil` script
