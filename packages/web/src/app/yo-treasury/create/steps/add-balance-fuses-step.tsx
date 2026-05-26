'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  BALANCE_FUSES,
  plasmaVaultAbi,
} from '../vault-creation.constants';

interface Props {
  vaultAddress: Address;
  enabled: boolean;
}

export function AddBalanceFusesStep({ vaultAddress, enabled }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // After each balance fuse tx confirms, advance to next
  useEffect(() => {
    if (isConfirmed) {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= BALANCE_FUSES.length) {
        setAllDone(true);
      } else {
        setCurrentIndex(nextIndex);
        resetWrite();
      }
    }
  }, [isConfirmed, currentIndex, resetWrite]);

  if (!enabled) {
    return <StepRow number={4} label="Add Balance Fuses" status="pending" />;
  }

  if (allDone) {
    return (
      <StepRow
        number={4}
        label="Add Balance Fuses"
        status="done"
        detail={`${BALANCE_FUSES.length}/${BALANCE_FUSES.length}`}
      />
    );
  }

  const current = BALANCE_FUSES[currentIndex];
  const status: StepStatus =
    isWriting || isConfirming ? 'loading' : writeError ? 'error' : 'pending';

  const handleAdd = () => {
    if (!current) return;
    writeContract({
      address: vaultAddress,
      abi: plasmaVaultAbi,
      functionName: 'addBalanceFuse',
      args: [current.marketId, current.fuse],
      chainId: CHAIN_ID,
    });
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={4}
        label="Add Balance Fuses"
        status={status}
        detail={
          isWriting
            ? `Adding ${current?.label}... (${currentIndex + 1}/${BALANCE_FUSES.length})`
            : isConfirming
              ? `Confirming ${current?.label}...`
              : `${currentIndex}/${BALANCE_FUSES.length} added`
        }
      />
      {status === 'pending' && (
        <Button onClick={handleAdd} size="sm" className="w-full">
          Add {current?.label} Balance Fuse ({currentIndex + 1}/
          {BALANCE_FUSES.length})
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
