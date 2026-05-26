# Storybook Runs on Anvil Fork — Implementation Plan

## Overview

Make Storybook run against local Anvil forks instead of real chains when launched with a flag, so that transactions don't spend real ETH/tokens. The wallet decorator and story files remain unchanged — only the startup mechanism and RPC routing change.

## Current State Analysis

- `wallet.decorator.tsx` creates a wagmi config reading `import.meta.env.NEXT_PUBLIC_RPC_URL_*` — currently pointing to real chain RPCs
- `private-key-connector.ts` signs transactions locally and submits via RPC — currently spending real ETH
- `.storybook/main.ts` `viteFinal` injects RPC URLs into Vite defines from `.env`
- 5 story files use `WalletDecorator`: create-treasury-vault, deposit-form, withdraw-form, vault-alpha, execute-actions
- All yo-treasury stories target Base (chain 8453), underlying token is USDC
- Test wallet: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`
- Existing `packages/mastra/src/tools/alpha/anvil-fork.ts` has a `spawnAnvilFork` pattern to reference

### Key Discoveries:

- `wallet.decorator.tsx:29-31` — RPC URLs come from `import.meta.env`, so overriding the Vite `define` is sufficient
- `.storybook/main.ts:34-37` — RPC URLs are injected in `viteFinal`, which is async and can be extended
- `vault-creation.constants.ts:35` — `CHAIN_ID = base.id` (8453)
- `vault-creation.constants.ts:49` — `UNDERLYING_TOKEN = YO_USDC_ADDRESS` on Base
- `deposit-form.stories.tsx:19` — Demo vault `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base

## Desired End State

- `pnpm sb` / `pnpm storybook` — works exactly as today (real RPCs)
- `pnpm sb:anvil` — starts Anvil forks for all 3 chains, overrides RPC URLs, funds test wallet, aborts if `anvil` not installed
- All stories that use `WalletDecorator` work identically but transactions go to Anvil forks
- Test wallet has ETH (gas) and USDC on Base fork
- Anvil processes are killed when storybook stops

### Verification:

1. Run `pnpm sb:anvil` — storybook starts, console shows Anvil fork ports
2. Open `http://localhost:6007/?path=/story/yo-treasury-create-treasury-vault--default`
3. Execute a transaction — succeeds on Anvil fork, no real ETH spent
4. Stop storybook — Anvil processes are killed
5. Run `pnpm sb` — works exactly as before (real RPCs)

## What We're NOT Doing

- Not changing `wallet.decorator.tsx` or `private-key-connector.ts`
- Not changing any story files
- Not adding mock providers or fake data — Anvil fork gives real chain state
- Not making Anvil optional when the flag is set — it's mandatory, abort on failure
- Not mocking external APIs — Anvil only forks EVM state. Features that call off-chain services (Odos/KyberSwap swap quotes, Yo REST API hooks like `useVaultSnapshot`/`useVaultYieldHistory`, subgraph indexers, Merkl rewards API) will still hit real endpoints and reflect real chain state, not fork state

## Implementation Approach

The key insight is that `wallet.decorator.tsx` already reads RPC URLs from `import.meta.env`. We only need to:
1. Start Anvil forks before Vite serves the app
2. Replace the RPC URL defines with Anvil localhost URLs
3. Fund the test wallet on the Base fork
4. Clean up Anvil processes on exit

This is done via:
- A standalone module `.storybook/anvil-forks.ts` that manages Anvil lifecycle
- Conditional logic in `.storybook/main.ts` `viteFinal` to start forks when `STORYBOOK_ANVIL=true`
- A tiny Vite plugin for cleanup on server close
- A new npm script `sb:anvil`

---

## Phase 1: Anvil Forks Module

### Overview

Create `.storybook/anvil-forks.ts` — a Node.js module that spawns Anvil fork processes and funds the test wallet.

### Changes Required:

#### 1. Create `.storybook/anvil-forks.ts`

**File**: `packages/web/.storybook/anvil-forks.ts`

```ts
import { spawn, execSync, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import {
  createTestClient,
  createWalletClient,
  http,
  parseUnits,
  type Address,
} from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';

// ─── Constants ───

const TEST_WALLET: Address = '0x35b4915b0fCA6097167fAa8340D3af3E51AA3841';

/** Base USDC contract */
const BASE_USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * USDC whale on Base — used to fund the test wallet via impersonation.
 * Pick a large, stable holder (e.g. a bridge or protocol treasury).
 * If this address runs dry at the fork block, update it.
 */
const BASE_USDC_WHALE: Address = '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A';

const USDC_AMOUNT = parseUnits('10000', 6); // 10,000 USDC

const CHAINS = [
  { chain: mainnet, envKey: 'NEXT_PUBLIC_RPC_URL_MAINNET' },
  { chain: arbitrum, envKey: 'NEXT_PUBLIC_RPC_URL_ARBITRUM' },
  { chain: base, envKey: 'NEXT_PUBLIC_RPC_URL_BASE' },
] as const;

const ERC20_TRANSFER_ABI = [
  {
    type: 'function' as const,
    name: 'transfer' as const,
    inputs: [
      { name: 'to', type: 'address' as const },
      { name: 'amount', type: 'uint256' as const },
    ],
    outputs: [{ name: '', type: 'bool' as const }],
    stateMutability: 'nonpayable' as const,
  },
] as const;

// ─── State ───

const anvilProcesses: ChildProcess[] = [];

// ─── Helpers ───

function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port'));
      }
    });
  });
}

async function waitForReady(port: number, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'net_version',
          params: [],
          id: 1,
        }),
      });
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Anvil did not start within ${timeoutMs}ms`);
}

// ─── Public API ───

export interface AnvilRpcUrls {
  NEXT_PUBLIC_RPC_URL_MAINNET: string;
  NEXT_PUBLIC_RPC_URL_ARBITRUM: string;
  NEXT_PUBLIC_RPC_URL_BASE: string;
}

/**
 * Start Anvil forks for all chains.
 * Aborts (throws) if `anvil` is not installed.
 * Returns the Anvil RPC URLs to use in Vite defines.
 */
export async function startAnvilForks(
  realRpcUrls: Record<string, string>,
): Promise<AnvilRpcUrls> {
  // ── Check anvil is installed ──
  try {
    execSync('which anvil', { stdio: 'ignore' });
  } catch {
    throw new Error(
      '\n\n❌ `anvil` not found. Install Foundry: https://book.getfoundry.sh/getting-started/installation\n' +
        '   Then run: foundryup\n',
    );
  }

  console.log('\n🔨 Starting Anvil forks...\n');

  const urls: Record<string, string> = {};

  // ── Spawn forks in parallel ──
  await Promise.all(
    CHAINS.map(async ({ chain, envKey }) => {
      const rpcUrl = realRpcUrls[envKey];
      if (!rpcUrl) {
        throw new Error(`Missing env var ${envKey} — cannot fork ${chain.name}`);
      }

      const port = await getRandomPort();
      const anvil = spawn(
        'anvil',
        ['--fork-url', rpcUrl, '--port', String(port), '--silent', '--no-rate-limit'],
        { stdio: 'ignore' },
      );

      anvilProcesses.push(anvil);

      anvil.on('error', (err) => {
        console.error(`Anvil (${chain.name}) error:`, err);
      });

      try {
        await waitForReady(port);
      } catch {
        throw new Error(`Anvil fork for ${chain.name} failed to start on port ${port}`);
      }

      const anvilUrl = `http://127.0.0.1:${port}`;
      urls[envKey] = anvilUrl;
      console.log(`  ✓ ${chain.name} (${chain.id}) forked → :${port}`);
    }),
  );

  // ── Fund test wallet on Base fork ──
  const baseUrl = urls.NEXT_PUBLIC_RPC_URL_BASE!;
  await fundTestWallet(baseUrl);

  console.log('\n🔨 Anvil forks ready.\n');

  return urls as AnvilRpcUrls;
}

/**
 * Kill all Anvil processes.
 */
export function stopAnvilForks(): void {
  for (const proc of anvilProcesses) {
    try {
      proc.kill('SIGTERM');
    } catch {
      // Already dead
    }
  }
  anvilProcesses.length = 0;
}

// ─── Wallet Funding ───

async function fundTestWallet(baseAnvilUrl: string): Promise<void> {
  const transport = http(baseAnvilUrl);
  const testClient = createTestClient({ chain: base, transport, mode: 'anvil' });

  // 1. Set ETH balance for gas
  await testClient.setBalance({
    address: TEST_WALLET,
    value: 100n * 10n ** 18n, // 100 ETH
  });
  console.log(`  ✓ Funded ${TEST_WALLET} with 100 ETH (gas)`);

  // 2. Impersonate USDC whale and transfer USDC
  await testClient.impersonateAccount({ address: BASE_USDC_WHALE });
  await testClient.setBalance({
    address: BASE_USDC_WHALE,
    value: 1n * 10n ** 18n, // gas for whale
  });

  const walletClient = createWalletClient({
    chain: base,
    account: BASE_USDC_WHALE,
    transport,
  });

  await walletClient.writeContract({
    address: BASE_USDC,
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [TEST_WALLET, USDC_AMOUNT],
  });

  await testClient.stopImpersonatingAccount({ address: BASE_USDC_WHALE });

  console.log(`  ✓ Transferred 10,000 USDC to ${TEST_WALLET} from whale`);
}
```

### Success Criteria:

#### Automated Verification:

- [ ] File compiles with no TypeScript errors: `npx tsc --noEmit packages/web/.storybook/anvil-forks.ts` (or checked via storybook build)
- [ ] `viem` is already a dependency of `packages/web`

#### Manual Verification:

- [ ] N/A — tested via Phase 3 integration

---

## Phase 2: Integration into Storybook Config

### Overview

Wire the Anvil forks module into `.storybook/main.ts` and add the npm script.

### Changes Required:

#### 1. Update `.storybook/main.ts`

**File**: `packages/web/.storybook/main.ts`
**Changes**: Import anvil module conditionally, call in `viteFinal`, add cleanup plugin.

```ts
import type { StorybookConfig } from '@storybook/react-vite';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import path from 'path';

const isAnvilMode = process.env.STORYBOOK_ANVIL === 'true';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['../public'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Load all env vars (including non-VITE_ prefixed) from .env files
    const env = loadEnv('', path.resolve(__dirname, '..'), '');

    let rpcMainnet = env.NEXT_PUBLIC_RPC_URL_MAINNET ?? '';
    let rpcArbitrum = env.NEXT_PUBLIC_RPC_URL_ARBITRUM ?? '';
    let rpcBase = env.NEXT_PUBLIC_RPC_URL_BASE ?? '';

    const plugins: Plugin[] = [];

    if (isAnvilMode) {
      const { startAnvilForks, stopAnvilForks } = await import('./anvil-forks');

      const anvilUrls = await startAnvilForks({
        NEXT_PUBLIC_RPC_URL_MAINNET: rpcMainnet,
        NEXT_PUBLIC_RPC_URL_ARBITRUM: rpcArbitrum,
        NEXT_PUBLIC_RPC_URL_BASE: rpcBase,
      });

      rpcMainnet = anvilUrls.NEXT_PUBLIC_RPC_URL_MAINNET;
      rpcArbitrum = anvilUrls.NEXT_PUBLIC_RPC_URL_ARBITRUM;
      rpcBase = anvilUrls.NEXT_PUBLIC_RPC_URL_BASE;

      // Cleanup plugin — kill Anvil when the dev server stops
      plugins.push({
        name: 'anvil-cleanup',
        configureServer(server) {
          const cleanup = () => {
            console.log('\n🔨 Stopping Anvil forks...');
            stopAnvilForks();
          };
          server.httpServer?.on('close', cleanup);
          process.on('SIGINT', () => { cleanup(); process.exit(0); });
          process.on('SIGTERM', () => { cleanup(); process.exit(0); });
        },
      });
    }

    return {
      ...config,
      plugins: [...(config.plugins ?? []), ...plugins],
      server: {
        ...config.server,
        proxy: {
          '/api': 'http://localhost:3000',
        },
      },
      define: {
        ...config.define,
        'import.meta.env.NEXT_PUBLIC_RPC_URL_MAINNET': JSON.stringify(rpcMainnet),
        'import.meta.env.NEXT_PUBLIC_RPC_URL_ARBITRUM': JSON.stringify(rpcArbitrum),
        'import.meta.env.NEXT_PUBLIC_RPC_URL_BASE': JSON.stringify(rpcBase),
        'import.meta.env.ALPHA_CONFIG_TEST_PRIVATE_KEY': JSON.stringify(env.ALPHA_CONFIG_TEST_PRIVATE_KEY ?? ''),
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': path.resolve(__dirname, '../src'),
        },
      },
    };
  },
};

export default config;
```

#### 2. Add npm script to `package.json`

**File**: `packages/web/package.json`
**Changes**: Add `sb:anvil` script.

```json
"sb:anvil": "STORYBOOK_ANVIL=true storybook dev -p 6007",
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm sb` starts normally (no Anvil, no changes in behavior)
- [ ] `pnpm sb:anvil` starts with Anvil forks visible in console output
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`

#### Manual Verification:

- [ ] Open `http://localhost:6007/?path=/story/yo-treasury-deposit-form--base` in Playwright MCP
- [ ] Wallet is connected, USDC balance is visible (10,000 USDC)
- [ ] Execute a deposit transaction — succeeds on Anvil, no real ETH spent
- [ ] Open `http://localhost:6007/?path=/story/yo-treasury-create-treasury-vault--default`
- [ ] Execute vault creation flow — succeeds on Anvil fork
- [ ] Stop storybook (`Ctrl+C`) — Anvil processes are killed (no orphaned processes)
- [ ] Restart with `pnpm sb` (no flag) — works exactly as before on real RPCs

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Phase 3: Playwright MCP E2E Verification

### Overview

Use Playwright MCP (browser automation) to verify the full flow end-to-end: storybook loads on Anvil fork, wallet is connected and funded, transactions execute without spending real money.

### Pre-requisites:

- `pnpm sb:anvil` is running on port 6007
- Playwright MCP server is available

### Test Scenarios:

#### Scenario 1: Deposit USDC into Treasury Vault

1. Navigate to `http://localhost:6007/?path=/story/yo-treasury-deposit-form--base`
2. Wait for story to render (wallet auto-connects via `WalletDecorator`)
3. Take snapshot — verify:
   - Wallet is connected (address shown)
   - USDC balance is visible (should show ~10,000 USDC)
   - Deposit form input is present
4. Enter a deposit amount (e.g., "100")
5. Click Approve button (if approval step required)
6. Wait for approval tx to confirm on Anvil fork
7. Click Deposit button
8. Wait for deposit tx to confirm
9. Take snapshot — verify:
   - Success state shown
   - Balance updated (USDC decreased, vault shares received)

#### Scenario 2: Withdraw from Treasury Vault

1. Navigate to `http://localhost:6007/?path=/story/yo-treasury-withdraw-form--base`
2. Wait for story to render
3. Take snapshot — verify wallet connected, share balance visible (from Scenario 1 deposit)
4. Enter withdrawal amount
5. Submit redeem transaction
6. Wait for tx confirmation
7. Take snapshot — verify success state, USDC returned

**Note on full lifecycle**: The complete testable flow on Anvil is: deposit USDC → allocate to yoUSD → withdraw from yoUSD → withdraw from treasury. However, allocation and yoUSD withdrawal are agent-driven actions (via `execute()`), not yet exposed in the UI. The deposit and withdraw form stories test the UI-facing portion of this flow.

#### Scenario 3: Create Treasury Vault — Full Multi-Step Flow

1. Navigate to `http://localhost:6007/?path=/story/yo-treasury-create-treasury-vault--default`
2. Wait for story to render
3. Take snapshot — verify wallet connected and on Base chain
4. Click through vault creation steps:
   - Clone vault (sends tx → Anvil fork)
   - Grant roles
   - Add fuses
   - Add balance fuses
   - Configure substrates
   - Update deps
5. Each step sends a transaction — all should succeed on Anvil
6. Take final snapshot — verify "Vault created and fully configured!" message

### Success Criteria:

#### Automated Verification:

- [ ] All 3 Playwright scenarios complete without errors

#### Manual Verification:

- [ ] Screenshots from each scenario show correct UI states
- [ ] No real ETH or USDC was spent (verify on block explorer — wallet balance unchanged on real Base)
- [ ] Anvil fork console shows transaction activity

**Implementation Note**: After completing this phase and all verification passes, the feature is complete. Document findings in the testing guide.

---

## Testing Strategy

### Manual Testing Steps:

1. `pnpm sb:anvil` — verify console shows "Starting Anvil forks..." and fork ports
2. Open deposit-form story — verify wallet shows USDC balance
3. Submit a deposit — verify tx succeeds on fork
4. Stop storybook — verify no orphaned `anvil` processes (`ps aux | grep anvil`)
5. `pnpm sb` — verify it still works on real RPCs (no Anvil logs)
6. Remove `anvil` from PATH, run `pnpm sb:anvil` — verify it aborts with a clear error

### Edge Cases:

- Missing RPC URL in `.env` — should abort with clear error message
- `anvil` not installed — should abort with install instructions
- Anvil fails to start (e.g. bad RPC URL) — should abort with error
- USDC whale has insufficient balance at fork block — update `BASE_USDC_WHALE` constant

## Performance Considerations

- Starting 3 Anvil forks adds ~5-10 seconds to storybook startup
- Each Anvil process uses ~50-100 MB of memory
- Forks run with `--no-rate-limit` for maximum throughput
- Forks run with `--silent` to avoid log noise

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0056-storybook-runs-on-anvil-fork.md`
- Existing Anvil fork pattern: `packages/mastra/src/tools/alpha/anvil-fork.ts`
- Wallet decorator: `packages/web/src/app/wallet.decorator.tsx`
- Storybook main config: `packages/web/.storybook/main.ts`
