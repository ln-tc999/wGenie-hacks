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

  // Use the REAL chain definition for publicClient so that SDKs (PlasmaVault, Morpho, etc.)
  // get the correct chainId for address lookups. Read calls don't validate chain ID.
  const publicClient = createPublicClient({ chain, transport });

  // Take snapshot so we can revert all state changes after simulation
  const snapshotId = await (publicClient as any).request({
    method: 'evm_snapshot',
    params: [],
  });

  return {
    publicClient,

    impersonateAndFund: async (address: Address) => {
      // Tenderly Admin RPC: all addresses are unlocked — no impersonateAccount needed.
      // Just fund with ETH for gas.
      await (publicClient as any).request({
        method: 'tenderly_setBalance',
        params: [
          [address],
          numberToHex(10n * 10n ** 18n), // 10 ETH
        ],
      });
    },

    // WalletClient uses the real chain for gas formatting (EIP-1559, etc.).
    // writeContract in simulate-on-fork.ts passes chain: null to skip chain ID assertion
    // (VNet chain ID may differ from real chain).
    createImpersonatedWalletClient: (account: Address) =>
      createWalletClient({ chain, account, transport }),

    revert: async () => {
      try {
        await (publicClient as any).request({
          method: 'evm_revert',
          params: [snapshotId],
        });
      } catch (e) {
        console.error('Failed to revert Tenderly snapshot:', e);
      }
    },
  };
}
