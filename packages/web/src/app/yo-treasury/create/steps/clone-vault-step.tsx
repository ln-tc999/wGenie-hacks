'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import type { Address } from 'viem';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  FACTORY_ADDRESS,
  UNDERLYING_TOKEN,
  fusionFactoryCloneAbi,
} from '../vault-creation.constants';

interface Props {
  onVaultCreated: (vaultAddress: Address, accessManagerAddress: Address) => void;
  existingVaultAddress: Address | null;
}

export function CloneVaultStep({ onVaultCreated, existingVaultAddress }: Props) {
  const { address } = useAccount();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';
  const vaultName = `YO Treasury ${truncated} ${format(new Date(), 'yyyy-MM-dd')}`;

  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: FACTORY_ADDRESS,
    abi: fusionFactoryCloneAbi,
    functionName: 'clone',
    args: [vaultName, 'yoTREASURY', UNDERLYING_TOKEN, 1n, address!, 0n],
    chainId: CHAIN_ID,
    query: { enabled: !!address && !existingVaultAddress },
  });

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Extract vault + access manager from simulation result when tx confirms
  useEffect(() => {
    if (isConfirmed && simulateData?.result) {
      const result = simulateData.result;
      onVaultCreated(result.plasmaVault, result.accessManager);
    }
  }, [isConfirmed, simulateData, onVaultCreated]);

  if (existingVaultAddress) {
    return (
      <StepRow
        number={1}
        label="Clone Vault"
        status="done"
        detail={`${existingVaultAddress.slice(0, 8)}...${existingVaultAddress.slice(-6)}`}
      />
    );
  }

  const status: StepStatus = isConfirmed
    ? 'done'
    : isWriting || isConfirming
      ? 'loading'
      : writeError
        ? 'error'
        : 'pending';

  const handleClone = () => {
    if (simulateData?.request) {
      writeContract(simulateData.request);
    }
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={1}
        label="Clone Vault"
        status={status}
        detail={
          isWriting
            ? 'Confirm in wallet...'
            : isConfirming
              ? 'Waiting for confirmation...'
              : undefined
        }
      />
      {status === 'pending' && (
        <Button
          onClick={handleClone}
          disabled={!simulateData?.request}
          size="sm"
          className="w-full"
        >
          Clone Vault
        </Button>
      )}
      {simulateError && !writeError && (
        <p className="text-xs text-destructive">
          Simulation failed: {simulateError.message.slice(0, 200)}
        </p>
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
