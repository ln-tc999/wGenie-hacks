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
const BASE_USDC_WHALE: Address = '0x02C79843B9548fC0Cb4B35Bf6840538a73fC3422';

const USDC_AMOUNT = parseUnits('1000000', 6); // 1,000,000 USDC

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
        throw new Error(
          `Missing env var ${envKey} — cannot fork ${chain.name}`,
        );
      }

      const port = await getRandomPort();
      const anvil = spawn(
        'anvil',
        [
          '--fork-url',
          rpcUrl,
          '--port',
          String(port),
          '--silent',
          '--no-rate-limit',
        ],
        { stdio: 'ignore' },
      );

      anvilProcesses.push(anvil);

      anvil.on('error', (err) => {
        console.error(`Anvil (${chain.name}) error:`, err);
      });

      try {
        await waitForReady(port);
      } catch {
        throw new Error(
          `Anvil fork for ${chain.name} failed to start on port ${port}`,
        );
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
  const testClient = createTestClient({
    chain: base,
    transport,
    mode: 'anvil',
  });

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

  console.log(`  ✓ Transferred 1,000,000 USDC to ${TEST_WALLET} from whale`);
}
