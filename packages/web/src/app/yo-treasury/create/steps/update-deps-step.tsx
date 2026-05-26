'use client';

import { useEffect } from 'react';
import type { Address } from 'viem';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  DEPENDENCY_MARKET_IDS,
  plasmaVaultAbi,
} from '../vault-creation.constants';

interface Props {
  vaultAddress: Address;
  enabled: boolean;
  onComplete: () => void;
}

export function UpdateDepsStep({ vaultAddress, enabled, onComplete }: Props) {
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) onComplete();
  }, [isConfirmed, onComplete]);

  // Note: updateDependencyBalanceGraphs accepts arrays — we can do all 4 in one call
  if (!enabled) {
    return (
      <StepRow number={6} label="Update Dependency Graphs" status="pending" />
    );
  }

  if (isConfirmed) {
    return (
      <StepRow
        number={6}
        label="Update Dependency Graphs"
        status="done"
        detail={`${DEPENDENCY_MARKET_IDS.length} markets`}
      />
    );
  }

  const status: StepStatus =
    isWriting || isConfirming ? 'loading' : writeError ? 'error' : 'pending';

  const handleUpdate = () => {
    writeContract({
      address: vaultAddress,
      abi: plasmaVaultAbi,
      functionName: 'updateDependencyBalanceGraphs',
      args: [
        [...DEPENDENCY_MARKET_IDS],
        DEPENDENCY_MARKET_IDS.map(() => [] as bigint[]),
      ],
      chainId: CHAIN_ID,
    });
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={6}
        label="Update Dependency Graphs"
        status={status}
        detail={
          isWriting
            ? 'Confirm in wallet...'
            : isConfirming
              ? 'Waiting for confirmation...'
              : `${DEPENDENCY_MARKET_IDS.length} markets`
        }
      />
      {status === 'pending' && (
        <Button onClick={handleUpdate} size="sm" className="w-full">
          Update Dependency Graphs
        </Button>
      )}
      {writeError && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            {writeError.message.slice(0, 200)}
          </p>
          <Button variant="ghost" size="sm" onClick={() => resetWrite()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
