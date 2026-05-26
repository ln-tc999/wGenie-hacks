# FSN-0087: Replace Anvil Simulation for Serverless Deployment

## Context

Mastra is now deployed to Vercel serverless (FSN-0086). Agent chat works, but any tool that creates actions (allocate, withdraw, swap, supply, borrow) fails because the simulation step spawns an `anvil` binary process — which doesn't exist on Vercel's serverless runtime.

**Error**: `Simulation failed: Anvil did not start within 15000ms`

## What Currently Happens

1. Agent tool creates fuse actions (encoded calldata)
2. `simulateOnFork()` in `packages/mastra/src/tools/alpha/simulate-on-fork.ts` spawns a local Anvil process via `child_process.spawn('anvil', ...)`
3. It reads balances before, executes on fork, reads balances after
4. Returns before/after balance diff in the Transaction Proposal card
5. On Vercel: `anvil` binary not found → 15s timeout → error

### Files involved
- `packages/mastra/src/tools/alpha/anvil-fork.ts` — `spawnAnvilFork()` spawns the binary
- `packages/mastra/src/tools/alpha/simulate-on-fork.ts` — `simulateOnFork()` orchestrates before/after
- `packages/mastra/src/tools/alpha/build-transaction-proposal.ts` — calls `simulateOnFork()`
- YO Treasury tools use the same pattern

### What simulation provides
- **Before/after balance snapshots** — user sees impact of actions before executing
- **Error detection** — reverts caught before on-chain execution
- **Impersonation** — simulates as the caller's address (vault owner/alpha)

## Options to Consider

### 1. Skip simulation on serverless (quickest)
- Detect environment (e.g., `process.env.VERCEL` or absence of `anvil`) and return `{ success: true, simulationSkipped: true }`
- Transaction Proposal card shows actions without before/after diff
- Client-side already skips simulation (auto-advances when wallet+chain+role ready)
- **Pro**: Zero effort, unblocks all agent flows immediately
- **Con**: No safety net — user can't see impact before executing

### 2. Tenderly Simulation API
- Use [Tenderly Simulation API](https://docs.tenderly.co/simulations/simulation-api) to simulate transactions remotely
- Supports `eth_call` with state overrides, impersonation, full trace
- Can return balance changes, event logs, gas estimates
- **Pro**: Production-grade, no binary dependency, works everywhere
- **Con**: Requires Tenderly account/API key, API call latency, may need to adapt balance-reading logic

### 3. RPC `eth_call` with state overrides
- Use `eth_call` on the real RPC with `stateOverrides` to simulate
- Some RPCs (Alchemy, Infura) support `eth_simulateV1` or Geth-style state overrides
- **Pro**: No external service, uses existing RPC URLs
- **Con**: Limited — can't easily do multi-step simulation (read balances → execute → read balances), no impersonation on all RPCs

### 4. Remote Anvil service
- Run a persistent Anvil instance on Railway/Fly.io
- Mastra connects to it via RPC URL instead of spawning locally
- **Pro**: Exact same simulation logic, just remote
- **Con**: Extra infrastructure, cold start latency, need to manage fork freshness

### 5. Hybrid: skip simulation in prod, keep Anvil locally
- `if (process.env.VERCEL) return skipSimulation()` in `simulateOnFork()`
- Local dev keeps full Anvil simulation
- Could add Tenderly later as an upgrade
- **Pro**: Minimal change, preserves local dev experience
- **Con**: Prod users don't get simulation

## Recommendation

Start with **Option 5** (hybrid skip) to unblock immediately, then evaluate **Option 2** (Tenderly) as the proper solution. Tenderly's simulation API is designed for exactly this use case and would give production-quality simulation without any binary dependencies.

## References

- Mastra deployment: `thoughts/kuba/tickets/fsn_0086-deploy-mastra.md`
- Anvil fork code: `packages/mastra/src/tools/alpha/anvil-fork.ts`
- Simulation code: `packages/mastra/src/tools/alpha/simulate-on-fork.ts`
- [Tenderly Simulation API](https://docs.tenderly.co/simulations/simulation-api)
- [Alchemy Transact API (simulateExecution)](https://docs.alchemy.com/reference/alchemy-simulateexecution)
