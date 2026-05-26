/**
 * Deploy 4 YoRedeemFuse instances to Base mainnet (one per ERC4626 market).
 *
 * Usage:
 *   cd packages/hardhat-tests
 *   npx tsx scripts/deploy-yo-redeem-fuse.ts
 *
 * Requires RPC_URL_BASE in .env
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
import { createInterface } from 'node:readline';
import {
  createPublicClient,
  createWalletClient,
  http,
  isHex,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YoRedeemFuseArtifact = require('../artifacts/contracts/YoRedeemFuse.sol/YoRedeemFuse.json');

const RPC_URL = process.env.RPC_URL_BASE;
if (!RPC_URL) {
  console.error('RPC_URL_BASE not set in .env');
  process.exit(1);
}

const MARKETS = [
  { name: 'yoUSD', marketId: 100_001n },
  { name: 'yoETH', marketId: 100_002n },
  { name: 'yoBTC', marketId: 100_003n },
  { name: 'yoEUR', marketId: 100_004n },
] as const;

// Parse --start flag to resume from a specific index (0-based)
const startIndex = (() => {
  const idx = process.argv.indexOf('--start');
  return idx !== -1 ? parseInt(process.argv[idx + 1]!, 10) : 0;
})();

// --- Secure private key prompt (masked input) ---

function promptSecret(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);

    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin });
      rl.once('line', (line: string) => {
        rl.close();
        resolve(line.trim());
      });
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let input = '';
    const onData = (key: string) => {
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else if (key === '\u007f' || key === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += key;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

function validatePrivateKey(key: string): Hex {
  const trimmed = key.trim();
  if (!isHex(trimmed) || trimmed.length !== 66) {
    throw new Error(
      'Invalid private key format. Expected 0x-prefixed 32-byte hex string (66 characters).',
    );
  }
  return trimmed;
}

// --- Main ---

async function main() {
  const keyInput = await promptSecret('Enter deployer private key: ');
  const privateKey = validatePrivateKey(keyInput);
  const account = privateKeyToAccount(privateKey);

  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain: base, transport });
  const walletClient = createWalletClient({ chain: base, transport, account });

  console.log(`\nDeployer: ${account.address}`);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance:  ${(Number(balance) / 1e18).toFixed(6)} ETH\n`);

  if (balance === 0n) {
    console.error('Deployer has no ETH on Base. Fund it first.');
    process.exit(1);
  }

  const results: { name: string; marketId: bigint; address: Address }[] = [];

  let nonce = await publicClient.getTransactionCount({ address: account.address });

  for (let i = startIndex; i < MARKETS.length; i++) {
    const { name, marketId } = MARKETS[i]!;
    console.log(`[${i + 1}/4] Deploying YoRedeemFuse for ${name} (marketId=${marketId}, nonce=${nonce})...`);

    const hash = await walletClient.deployContract({
      abi: YoRedeemFuseArtifact.abi,
      bytecode: YoRedeemFuseArtifact.bytecode as `0x${string}`,
      args: [marketId],
      nonce,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress!;
    results.push({ name, marketId, address });
    nonce++;

    console.log(`  -> ${address} (tx: ${hash})\n`);
  }

  console.log('\n=== Add to packages/sdk/src/markets/yo/yo.addresses.ts ===\n');

  const slotNames = ['SLOT1', 'SLOT2', 'SLOT3', 'SLOT4'];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    console.log(`// YoRedeemFuse for ${r.name} (marketId=${r.marketId})`);
    console.log(`export const YO_REDEEM_FUSE_${slotNames[i]}_ADDRESS = createChainAddresses({`);
    console.log(`  [base.id]: '${r.address}',`);
    console.log('});\n');
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
