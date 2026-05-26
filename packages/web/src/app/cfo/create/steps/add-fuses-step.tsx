'use client';

import type { Address } from 'viem';
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  ALL_FUSE_ADDRESSES,
  plasmaVaultAbi,
} from '../vault-creation.constants';

interface Props {
  vaultAddress: Address;
  enabled: boolean;
}

export function AddFusesStep({ vaultAddress, enabled }: Props) {
  // Check if fuses already added
  const { data: existingFuses } = useReadContract({
    address: vaultAddress,
    abi: plasmaVaultAbi,
    functionName: 'getFuses',
    chainId: CHAIN_ID,
    query: { enabled },
  });

  const fusesAdded =
    !!existingFuses && (existingFuses as Address[]).length >= ALL_FUSE_ADDRESSES.length;

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  if (!enabled) {
    return <StepRow number={3} label="Add Fuses" status="pending" />;
  }

  if (fusesAdded || isConfirmed) {
    return (
      <StepRow
        number={3}
        label="Add Fuses"
        status="done"
        detail={`${ALL_FUSE_ADDRESSES.length} fuses`}
      />
    );
  }

  const status: StepStatus =
    isWriting || isConfirming ? 'loading' : writeError ? 'error' : 'pending';

  const handleAddFuses = () => {
    writeContract({
      address: vaultAddress,
      abi: plasmaVaultAbi,
      functionName: 'addFuses',
      args: [ALL_FUSE_ADDRESSES],
      chainId: CHAIN_ID,
    });
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={3}
        label="Add Fuses"
        status={status}
        detail={
          isWriting
            ? 'Confirm in wallet...'
            : isConfirming
              ? 'Waiting for confirmation...'
              : `${ALL_FUSE_ADDRESSES.length} fuses to add`
        }
      />
      {status === 'pending' && (
        <Button onClick={handleAddFuses} size="sm" className="w-full">
          Add {ALL_FUSE_ADDRESSES.length} Fuses
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
