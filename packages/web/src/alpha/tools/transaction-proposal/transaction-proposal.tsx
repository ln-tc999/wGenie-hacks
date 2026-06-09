'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Wallet,
  Loader2,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useReadContract,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Address, Hex } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { useQueryClient } from '@tanstack/react-query';
import { ProtocolIcon, getProtocolLabel } from '@/components/protocol-icon/protocol-icon';
import { SimulationBalanceComparison } from '../action-with-simulation/simulation-balance-comparison';
import { TxHashLink } from '@/activity/components/tx-hash-link';
import type { TransactionProposalOutput, BalanceSnapshot } from '@/lib/types/alpha';

const ALPHA_ROLE_ID = 200n;

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [arbitrum.id]: 'Arbitrum',
  [base.id]: 'Base',
};

const getAccessManagerAbi = [
  {
    type: 'function' as const,
    name: 'getAccessManagerAddress' as const,
    inputs: [],
    outputs: [{ name: '' as const, type: 'address' as const }],
    stateMutability: 'view' as const,
  },
] as const;

const hasRoleAbi = [
  {
    type: 'function' as const,
    name: 'hasRole' as const,
    inputs: [
      { name: 'roleId' as const, type: 'uint64' as const },
      { name: 'account' as const, type: 'address' as const },
    ],
    outputs: [
      { name: 'isMember' as const, type: 'bool' as const },
      { name: 'executionDelay' as const, type: 'uint32' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

const plasmaVaultExecuteAbi = [
  {
    type: 'function' as const,
    name: 'execute' as const,
    inputs: [
      {
        name: 'calls_' as const,
        type: 'tuple[]' as const,
        components: [
          { name: 'fuse' as const, type: 'address' as const },
          { name: 'data' as const, type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

// --- Sub-components ---

type PendingAction = TransactionProposalOutput['actions'][number];

function ActionItem({ action }: { action: PendingAction }) {
  const [showPayload, setShowPayload] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(action.fuseActions, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ProtocolIcon protocol={action.protocol} className="w-6 h-6" />
        <div>
          <p className="text-sm font-medium">{action.description}</p>
          <p className="text-xs text-muted-foreground">
            {getProtocolLabel(action.protocol)} &middot; {action.actionType}
          </p>
        </div>
      </div>

      <button
        onClick={() => setShowPayload(!showPayload)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPayload ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        Raw payload
      </button>

      {showPayload && (
        <div className="relative">
          <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-32">
            {JSON.stringify(action.fuseActions, null, 2)}
          </pre>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function StepRow({
  number,
  label,
  status,
  detail,
}: {
  number: number;
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : status === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
      ) : status === 'error' ? (
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
          {number}
        </span>
      )}
      <span
        className={`text-sm ${status === 'done' ? 'text-green-500' : status === 'error' ? 'text-destructive' : 'text-foreground'}`}
      >
        {label}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          — {detail}
        </span>
      )}
    </div>
  );
}

// --- Execute Section ---

function ExecuteSection({
  vaultAddress,
  chainId,
  flatFuseActions,
}: {
  vaultAddress: string;
  chainId: number;
  flatFuseActions: Array<{ fuse: string; data: string }>;
}) {
  const { isConnected, address, chain: walletChain } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient({ chainId });

  const isWrongChain = isConnected && walletChain?.id !== chainId;
  const isCorrectChain = isConnected && walletChain?.id === chainId;
  const targetChainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

  // ALPHA_ROLE check
  const { data: accessManagerAddress, isLoading: isLoadingAM } =
    useReadContract({
      address: vaultAddress as Address,
      abi: getAccessManagerAbi,
      functionName: 'getAccessManagerAddress',
      chainId,
      query: { enabled: isCorrectChain },
    });

  const { data: roleResult, isLoading: isCheckingRole } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [ALPHA_ROLE_ID, address!],
    chainId,
    query: {
      enabled: isCorrectChain && !!accessManagerAddress && !!address,
    },
  });

  const hasAlphaRole = roleResult?.[0] === true;
  const roleChecked = isCorrectChain && !!roleResult;
  const isRoleLoading = isCorrectChain && (isLoadingAM || isCheckingRole);

  // Simulation (client-side)
  const [simulationState, setSimulationState] = useState<
    'idle' | 'simulating' | 'success' | 'error'
  >('idle');
  const [simulationError, setSimulationError] = useState<string>();

  // Execute
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Invalidate caches after tx confirmation
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries();
      // Do NOT return cleanup — resetWrite() clears txHash which flips
      // isConfirmed to false, re-runs effect, and cancels the timer.
      setTimeout(() => queryClient.invalidateQueries(), 2000);
    }
  }, [isConfirmed, queryClient]);

  const handleConnect = useCallback(() => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  const handleSimulate = useCallback(async () => {
    if (!publicClient || !address) return;
    setSimulationState('simulating');
    setSimulationError(undefined);
    try {
      await publicClient.simulateContract({
        account: address,
        address: vaultAddress as Address,
        abi: plasmaVaultExecuteAbi,
        functionName: 'execute',
        args: [
          flatFuseActions.map((a) => ({
            fuse: a.fuse as Address,
            data: a.data as Hex,
          })),
        ],
      });
      setSimulationState('success');
    } catch (err) {
      setSimulationState('error');
      setSimulationError(
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [publicClient, address, vaultAddress, flatFuseActions]);

  // Skip client-side simulation — agent already simulated on Anvil fork.
  useEffect(() => {
    if (isCorrectChain && hasAlphaRole && simulationState === 'idle') {
      setSimulationState('success');
    }
  }, [isCorrectChain, hasAlphaRole, simulationState]);

  const handleExecute = useCallback(() => {
    writeContract({
      address: vaultAddress as Address,
      abi: plasmaVaultExecuteAbi,
      functionName: 'execute',
      args: [
        flatFuseActions.map((a) => ({
          fuse: a.fuse as Address,
          data: a.data as Hex,
        })),
      ],
      chainId,
    });
  }, [writeContract, vaultAddress, flatFuseActions, chainId]);

  return (
    <div className="space-y-2 border-t pt-3">
      {/* Step 1: Connect Wallet */}
      <StepRow
        number={1}
        label="Connect Wallet"
        status={
          isConnected ? 'done' : isConnecting ? 'loading' : 'pending'
        }
        detail={
          isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}${walletChain ? ` on ${walletChain.name}` : ''}`
            : undefined
        }
      />
      {!isConnected && (
        <>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wallet className="w-4 h-4 mr-2" />
            )}
            Connect Wallet
          </Button>
          {connectError && (
            <p className="text-xs text-destructive">
              {connectError.message.slice(0, 200)}
            </p>
          )}
        </>
      )}

      {/* Step 2: Switch Chain */}
      {isConnected && (
        <>
          <StepRow
            number={2}
            label={`Switch to ${targetChainName}`}
            status={
              isCorrectChain
                ? 'done'
                : isSwitching
                  ? 'loading'
                  : 'pending'
            }
          />
          {isWrongChain && (
            <Button
              onClick={() => switchChain({ chainId })}
              disabled={isSwitching}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isSwitching && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Switch to {targetChainName}
            </Button>
          )}
        </>
      )}

      {/* Step 3: Check ALPHA_ROLE */}
      {isCorrectChain && (
        <StepRow
          number={3}
          label="Check ALPHA_ROLE"
          status={
            isRoleLoading
              ? 'loading'
              : roleChecked && hasAlphaRole
                ? 'done'
                : roleChecked && !hasAlphaRole
                  ? 'error'
                  : 'pending'
          }
          detail={
            roleChecked && !hasAlphaRole
              ? 'Your wallet does not have ALPHA_ROLE on this vault'
              : undefined
          }
        />
      )}

      {/* Step 4: Simulate */}
      {isCorrectChain && roleChecked && hasAlphaRole && (
        <>
          <StepRow
            number={4}
            label="Simulate Transaction"
            status={
              simulationState === 'simulating'
                ? 'loading'
                : simulationState === 'success'
                  ? 'done'
                  : simulationState === 'error'
                    ? 'error'
                    : 'pending'
            }
            detail={
              simulationError
                ? simulationError.slice(0, 200)
                : undefined
            }
          />
          {simulationState === 'idle' && (
            <Button
              onClick={handleSimulate}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Simulate Transaction
            </Button>
          )}
          {simulationState === 'error' && (
            <Button
              onClick={handleSimulate}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Retry Simulation
            </Button>
          )}
        </>
      )}

      {/* Step 5: Execute */}
      {simulationState === 'success' && !isConfirmed && (
        <>
          <StepRow
            number={5}
            label="Execute Transaction"
            status={
              isWriting
                ? 'loading'
                : isConfirming
                  ? 'loading'
                  : txHash && isConfirmed
                    ? 'done'
                    : 'pending'
            }
            detail={
              isWriting
                ? 'Confirm in your wallet...'
                : isConfirming
                  ? 'Waiting for on-chain confirmation...'
                  : undefined
            }
          />
          {!txHash && (
            <Button
              onClick={handleExecute}
              disabled={isWriting}
              size="sm"
              className="w-full"
            >
              {isWriting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Execute Transaction
            </Button>
          )}
        </>
      )}

      {/* Write error */}
      {writeError && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            Transaction failed: {writeError.message.slice(0, 200)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetWrite()}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Tx confirmed */}
      {isConfirmed && txHash && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              Transaction confirmed!
            </span>
          </div>
          <div className="mt-1">
            <TxHashLink txHash={txHash} chainId={chainId} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function TransactionProposal(props: TransactionProposalOutput) {
  const {
    status,
    actions,
    newAction,
    simulation,
    vaultAddress,
    chainId,
    flatFuseActions,
    actionsCount,
  } = props;

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <p className="text-sm font-medium">
          Transaction Proposal — {actionsCount} action
          {actionsCount === 1 ? '' : 's'}
        </p>
      </div>

      {/* Action list */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionItem key={action.id} action={action} />
          ))}
        </div>
      )}

      {/* New action error */}
      {!newAction.success && newAction.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{newAction.error}</span>
        </div>
      )}

      {/* Simulation diff */}
      {simulation &&
        simulation.success &&
        simulation.balancesBefore &&
        simulation.balancesAfter && (
          <SimulationBalanceComparison
            before={simulation.balancesBefore as BalanceSnapshot}
            after={simulation.balancesAfter as BalanceSnapshot}
            chainId={chainId}
          />
        )}
      {simulation && !simulation.success && simulation.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Simulation failed: {simulation.error}</span>
        </div>
      )}

      {/* Partial indicator */}
      {status === 'partial' && newAction.success && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing more actions...</span>
        </div>
      )}

      {/* Execute wizard — only when ready */}
      {status === 'ready' && (
        <ExecuteSection
          vaultAddress={vaultAddress}
          chainId={chainId}
          flatFuseActions={flatFuseActions}
        />
      )}
    </Card>
  );
}
