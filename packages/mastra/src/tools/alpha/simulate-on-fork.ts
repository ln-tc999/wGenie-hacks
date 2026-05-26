import { type Address, type Hex } from 'viem';
import { readVaultBalances } from './read-vault-balances';
import { createTenderlyFork } from './tenderly-fork';
import type { BalanceSnapshot } from './types';

/** Minimal ABI for PlasmaVault.execute(FuseAction[]) */
const plasmaVaultExecuteAbi = [
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: 'calls_',
        type: 'tuple[]',
        internalType: 'struct FuseAction[]',
        components: [
          { name: 'fuse', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export interface SimulationInput {
  vaultAddress: string;
  chainId: number;
  callerAddress: string;
  flatFuseActions: Array<{ fuse: string; data: string }>;
  /** Extra token addresses to include in balance snapshots (e.g. YO vault underlyings) */
  additionalTokenAddresses?: string[];
}

export interface SimulationOutput {
  success: boolean;
  message: string;
  actionsCount: number;
  fuseActionsCount: number;
  balancesBefore?: BalanceSnapshot;
  balancesAfter?: BalanceSnapshot;
  error?: string;
}

/**
 * Simulate fuse actions on a Tenderly Virtual TestNet fork.
 * Reads balances before and after execution.
 * State is reverted via evm_snapshot/evm_revert after each simulation.
 */
export async function simulateOnFork(input: SimulationInput): Promise<SimulationOutput> {
  const { vaultAddress, chainId, callerAddress, flatFuseActions, additionalTokenAddresses } = input;
  const extraTokens = additionalTokenAddresses?.map(a => a as Address);

  if (flatFuseActions.length === 0) {
    return {
      success: false,
      message: 'No fuse actions to simulate',
      actionsCount: 0,
      fuseActionsCount: 0,
    };
  }

  let fork: Awaited<ReturnType<typeof createTenderlyFork>> | null = null;

  try {
    fork = await createTenderlyFork(chainId);

    const balancesBefore = await readVaultBalances(
      fork.publicClient,
      vaultAddress as Address,
      extraTokens,
    );

    await fork.impersonateAndFund(callerAddress as Address);

    const walletClient = fork.createImpersonatedWalletClient(callerAddress as Address);
    const hash = await walletClient.writeContract({
      account: callerAddress as Address,
      chain: null,
      address: vaultAddress as Address,
      abi: plasmaVaultExecuteAbi,
      functionName: 'execute',
      args: [flatFuseActions.map(a => ({
        fuse: a.fuse as Address,
        data: a.data as Hex,
      }))],
    });

    await fork.publicClient.waitForTransactionReceipt({ hash });

    const balancesAfter = await readVaultBalances(
      fork.publicClient,
      vaultAddress as Address,
      extraTokens,
    );

    return {
      success: true,
      message: `Simulation successful — ${flatFuseActions.length} fuse action${flatFuseActions.length === 1 ? '' : 's'} executed on fork.`,
      actionsCount: 0, // caller sets this
      fuseActionsCount: flatFuseActions.length,
      balancesBefore,
      balancesAfter,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Simulation failed: ${errorMessage}`,
      actionsCount: 0,
      fuseActionsCount: flatFuseActions.length,
      error: errorMessage,
    };
  } finally {
    await fork?.revert();
  }
}
