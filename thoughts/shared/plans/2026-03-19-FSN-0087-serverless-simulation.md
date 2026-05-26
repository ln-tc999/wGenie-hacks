# FSN-0087: Replace Anvil Simulation with Tenderly Virtual TestNets

## Overview

Replace the local Anvil binary fork (`child_process.spawn('anvil')`) with pre-existing long-lived Tenderly Virtual TestNets. The current simulation spawns an `anvil` process which fails on Vercel serverless (`Anvil did not start within 15000ms`). Tenderly Virtual TestNets provide the same RPC interface, so `readVaultBalances()` and all downstream code stays unchanged — we only swap how the fork is created and cleaned up.

## Current State Analysis

### How simulation works today

1. Agent tool creates fuse actions (encoded calldata)
2. `buildTransactionProposal()` calls `simulateOnFork()` when `callerAddress` is available
3. `simulateOnFork()` spawns a local Anvil process via `child_process.spawn('anvil', ...)`
4. Reads balances before (`readVaultBalances` via fork's `publicClient`)
5. Impersonates caller, executes `PlasmaVault.execute(FuseAction[])` on fork
6. Reads balances after
7. Returns before/after balance snapshots in TransactionProposalOutput
8. Kills Anvil process in `finally` block

### Files involved

- `packages/mastra/src/tools/alpha/anvil-fork.ts` — `spawnAnvilFork()` spawns the Anvil binary
- `packages/mastra/src/tools/alpha/simulate-on-fork.ts` — `simulateOnFork()` orchestrates before/after
- `packages/mastra/src/tools/alpha/build-transaction-proposal.ts` — calls `simulateOnFork()` (unchanged)
- `packages/mastra/src/tools/alpha/read-vault-balances.ts` — reads ERC20 + DeFi market positions (unchanged)
- `packages/mastra/src/env.ts` — environment variable schema

### Callers (all unchanged — they call `buildTransactionProposal`)

- `packages/mastra/src/tools/alpha/create-aave-v3-action.ts`
- `packages/mastra/src/tools/alpha/create-euler-v2-action.ts`
- `packages/mastra/src/tools/alpha/create-morpho-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts`

### Key Discoveries

- `readVaultBalances()` accepts any viem `PublicClient` (`read-vault-balances.ts:137`) — it will work unchanged against a Tenderly RPC endpoint
- `buildTransactionProposal()` is the only caller of `simulateOnFork()` — no other code paths need updating
- The frontend (`transaction-proposal.tsx:571-580`) already handles missing/failed simulation gracefully
- Client-side simulation is already skipped (`transaction-proposal.tsx:296-300`)
- `createImpersonatedWalletClient` creates a viem `WalletClient` with just an address (no private key) — this sends unsigned `eth_sendTransaction`, which Tenderly Admin RPC accepts by default

## Desired End State

- All agent simulation flows work on Vercel serverless (no binary dependencies)
- Before/after balance snapshots are identical to the current Anvil-based simulation
- `anvil-fork.ts` is deleted — Tenderly is the only simulation backend
- Three pre-created long-lived Tenderly Virtual TestNets (one per chain) are used
- State is cleanly reset between simulations via `evm_snapshot` / `evm_revert`

### How to verify

1. Deploy to Vercel with Tenderly env vars set
2. Open Mastra agent chat, trigger an action (e.g., "Allocate 100 USDC to Aave V3")
3. Transaction Proposal card shows before/after balance diff (not "Simulation failed")
4. Execute the transaction — works end-to-end
5. Run a second simulation — state is clean (no artifacts from prior simulation)

## What We're NOT Doing

- No Anvil fallback — Tenderly only, everywhere (local dev and prod)
- No REST API for creating/deleting Virtual TestNets — they're pre-created by the user
- No changes to `readVaultBalances`, `buildTransactionProposal`, or any of the 6 action tools
- No changes to the frontend Transaction Proposal component
- No concurrency handling (agent processes requests sequentially)

## Implementation Approach

Pre-existing long-lived Tenderly Virtual TestNets (one per chain: Ethereum, Arbitrum, Base) with `evm_snapshot`/`evm_revert` for clean state between simulations. The user creates the Virtual TestNets in the Tenderly dashboard, configures them pinned to recent blocks, and provides the Admin RPC URLs as environment variables.

The `AnvilFork` interface stays the same conceptually but `kill()` becomes `revert()` (rolls back state instead of killing a process).

---

## Phase 1: Create `tenderly-fork.ts` and update env vars

### Overview

Create a new Tenderly fork module that connects to pre-existing Virtual TestNets via Admin RPC URLs. Add the required environment variables.

### Changes Required:

#### 1. Add Tenderly env vars

**File**: `packages/mastra/src/env.ts`
**Changes**: Add three Tenderly Admin RPC URL env vars to the schema, and a `TENDERLY_RPC_URLS` export mirroring the `RPC_URLS` pattern.

```typescript
// Add to envSchema:
TENDERLY_RPC_URL_ETHEREUM: z.string().url().optional(),
TENDERLY_RPC_URL_ARBITRUM: z.string().url().optional(),
TENDERLY_RPC_URL_BASE: z.string().url().optional(),
```

```typescript
// Add new export:
export const TENDERLY_RPC_URLS: Record<number, string | undefined> = {
  1: env.TENDERLY_RPC_URL_ETHEREUM,
  42161: env.TENDERLY_RPC_URL_ARBITRUM,
  8453: env.TENDERLY_RPC_URL_BASE,
};
```

#### 2. Create Tenderly fork module

**File**: `packages/mastra/src/tools/alpha/tenderly-fork.ts` (new file)
**Changes**: New module that creates viem clients against Tenderly Admin RPC and manages snapshot/revert lifecycle.

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  numberToHex,
} from 'viem';
import { SUPPORTED_CHAINS } from '../plasma-vault/utils/viem-clients';
import { TENDERLY_RPC_URLS } from '../../env';

/** Result of connecting to a Tenderly Virtual TestNet fork */
export interface TenderlyFork {
  publicClient: PublicClient;
  impersonateAndFund: (address: Address) => Promise<void>;
  createImpersonatedWalletClient: (account: Address) => WalletClient;
  /** Revert to the snapshot taken at fork creation — must always be called in finally block */
  revert: () => Promise<void>;
}

/**
 * Connect to a pre-existing Tenderly Virtual TestNet for the given chain.
 * Takes an evm_snapshot on creation; call revert() to roll back all state changes.
 */
export async function createTenderlyFork(chainId: number): Promise<TenderlyFork> {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);

  const adminRpcUrl = TENDERLY_RPC_URLS[chainId];
  if (!adminRpcUrl) {
    throw new Error(
      `Tenderly Admin RPC URL not configured for chain ${chainId}. ` +
        `Set TENDERLY_RPC_URL_ETHEREUM / TENDERLY_RPC_URL_ARBITRUM / TENDERLY_RPC_URL_BASE.`,
    );
  }

  const transport = http(adminRpcUrl);
  const publicClient = createPublicClient({ chain, transport });

  // Take snapshot so we can revert all state changes after simulation
  const snapshotId = await publicClient.request({
    method: 'evm_snapshot' as any,
    params: [] as any,
  });

  return {
    publicClient,

    impersonateAndFund: async (address: Address) => {
      // Tenderly Admin RPC: all addresses are unlocked — no impersonateAccount needed.
      // Just fund with ETH for gas.
      await publicClient.request({
        method: 'tenderly_setBalance' as any,
        params: [
          [address],
          numberToHex(10n * 10n ** 18n), // 10 ETH
        ] as any,
      });
    },

    createImpersonatedWalletClient: (account: Address) =>
      createWalletClient({ chain, account, transport }),

    revert: async () => {
      try {
        await publicClient.request({
          method: 'evm_revert' as any,
          params: [snapshotId] as any,
        });
      } catch (e) {
        console.error('Failed to revert Tenderly snapshot:', e);
      }
    },
  };
}
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] New env vars parse correctly with and without values set
- [ ] `TENDERLY_RPC_URLS` export matches the pattern of `RPC_URLS`

#### Manual Verification:

- [ ] Tenderly Virtual TestNets are created in the Tenderly dashboard (one per chain)
- [ ] Admin RPC URLs are set in `.env` / Vercel env vars

---

## Phase 2: Update `simulate-on-fork.ts` to use Tenderly

### Overview

Replace the `spawnAnvilFork` import with `createTenderlyFork`. Change `fork.kill()` to `await fork.revert()`.

### Changes Required:

#### 1. Switch fork provider

**File**: `packages/mastra/src/tools/alpha/simulate-on-fork.ts`
**Changes**:

Replace import:
```typescript
// Before:
import { spawnAnvilFork } from './anvil-fork';

// After:
import { createTenderlyFork } from './tenderly-fork';
```

Replace fork creation (line 68):
```typescript
// Before:
fork = await spawnAnvilFork(chainId);

// After:
fork = await createTenderlyFork(chainId);
```

Update type annotation (line 65):
```typescript
// Before:
let fork: Awaited<ReturnType<typeof spawnAnvilFork>> | null = null;

// After:
let fork: Awaited<ReturnType<typeof createTenderlyFork>> | null = null;
```

Update cleanup in finally block (lines 116-118):
```typescript
// Before:
finally {
  fork?.kill();
}

// After:
finally {
  await fork?.revert();
}
```

The rest of `simulateOnFork()` stays identical — `fork.publicClient`, `fork.impersonateAndFund()`, and `fork.createImpersonatedWalletClient()` all have the same interface.

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] No references to `anvil-fork` remain in `simulate-on-fork.ts`

#### Manual Verification:

- [ ] Agent chat: create an action → Transaction Proposal shows before/after balance diff
- [ ] Run a second simulation immediately after → state is clean (no leftover from prior sim)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Delete `anvil-fork.ts`

### Overview

Remove the Anvil fork module since Tenderly is the only simulation backend.

### Changes Required:

#### 1. Delete Anvil fork file

**File**: `packages/mastra/src/tools/alpha/anvil-fork.ts`
**Changes**: Delete the entire file.

#### 2. Verify no remaining references

Check that no file imports from `./anvil-fork` or references `spawnAnvilFork`. The only consumer was `simulate-on-fork.ts` which was updated in Phase 2.

Note: `packages/web/.storybook/anvil-forks.ts` is a separate file for Storybook's local Anvil setup — it is unrelated to the Mastra simulation and should NOT be deleted.

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] No imports of `anvil-fork` remain: `grep -r "anvil-fork" packages/mastra/src/`
- [ ] No references to `spawnAnvilFork` remain: `grep -r "spawnAnvilFork" packages/mastra/src/`

#### Manual Verification:

- [ ] Full agent simulation flow works end-to-end on Vercel

---

## Testing Strategy

### Manual Testing Steps:

1. **Local**: Set `TENDERLY_RPC_URL_BASE` in `.env`, run Mastra locally, trigger YO Treasury allocation → verify before/after balance diff appears
2. **Vercel**: Deploy with all three Tenderly env vars, trigger Alpha agent action on Ethereum → verify simulation works without Anvil binary
3. **State cleanup**: Run two simulations back-to-back on the same chain → verify second simulation has clean state (no ETH balance artifacts from first sim's `tenderly_setBalance`)
4. **Error handling**: Temporarily set an invalid Tenderly RPC URL → verify simulation fails gracefully with a descriptive error (not a crash)
5. **Multi-chain**: Test simulations on all three chains (Ethereum, Arbitrum, Base)

## Performance Considerations

- Tenderly RPC calls go over the network instead of localhost — simulation will be slower than local Anvil
- `evm_snapshot` and `evm_revert` add two extra RPC calls per simulation (negligible)
- `readVaultBalances` does 5-10 multicalls per snapshot — each is now a network round-trip to Tenderly. This is the main latency increase, but acceptable for an agent workflow
- No cold start concerns — Virtual TestNets are always running

## Environment Setup

### Tenderly Dashboard

1. Create 3 Virtual TestNets (one per chain):
   - Ethereum Mainnet (network_id: 1) — chain_id: 1
   - Arbitrum One (network_id: 42161) — chain_id: 42161
   - Base (network_id: 8453) — chain_id: 8453
2. Configure each with state syncing pinned to recent blocks
3. Copy the **Admin RPC URL** for each (not the Public RPC URL)

### Environment Variables

```bash
# Tenderly Virtual TestNet Admin RPC URLs
TENDERLY_RPC_URL_ETHEREUM=https://virtual.mainnet.rpc.tenderly.co/...
TENDERLY_RPC_URL_ARBITRUM=https://virtual.arbitrum.rpc.tenderly.co/...
TENDERLY_RPC_URL_BASE=https://virtual.base.rpc.tenderly.co/...
```

Set these in:
- Local `.env` for development
- Vercel project environment variables for production

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0087-serverless-simulation.md`
- Mastra deployment ticket: `thoughts/kuba/tickets/fsn_0086-deploy-mastra.md`
- Anvil fork code (to be deleted): `packages/mastra/src/tools/alpha/anvil-fork.ts`
- Simulation code: `packages/mastra/src/tools/alpha/simulate-on-fork.ts`
- [Tenderly Virtual TestNets](https://docs.tenderly.co/virtual-testnets)
- [Tenderly Admin RPC](https://docs.tenderly.co/virtual-testnets/admin-rpc)
- [Tenderly State Sync](https://docs.tenderly.co/virtual-testnets/state-sync)
- [Tenderly Revert State](https://docs.tenderly.co/virtual-testnets/develop/revert-state)
