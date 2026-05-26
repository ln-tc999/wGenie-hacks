'use client';

import { useState, useEffect } from 'react';
import type { Address, Hex } from 'viem';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  ERC4626_SUBSTRATES,
  SWAP_SUBSTRATES,
  SWAP_MARKET_ID,
  plasmaVaultAbi,
} from '../vault-creation.constants';

const ALL_SUBSTRATE_CONFIGS = [
  ...ERC4626_SUBSTRATES.map((s) => ({
    marketId: s.marketId,
    substrates: s.substrates as readonly Hex[],
    label: s.label,
  })),
  {
    marketId: SWAP_MARKET_ID,
    substrates: SWAP_SUBSTRATES as readonly Hex[],
    label: 'Swap',
  },
];

interface Props {
  vaultAddress: Address;
  enabled: boolean;
}

export function ConfigureSubstratesStep({ vaultAddress, enabled }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  // Check which substrates are already configured
  const { data: substrateChecks } = useReadContracts({
    contracts: ALL_SUBSTRATE_CONFIGS.map((config) => ({
      address: vaultAddress,
      abi: plasmaVaultAbi,
      functionName: 'getMarketSubstrates' as const,
      args: [config.marketId] as const,
      chainId: CHAIN_ID,
    })),
    query: { enabled },
  });

  // Find first market without substrates
  useEffect(() => {
    if (!substrateChecks) return;
    const firstMissing = substrateChecks.findIndex((r) => {
      const substrates = r.result as Hex[] | undefined;
      return !substrates || substrates.length === 0;
    });
    if (firstMissing === -1) {
      setAllDone(true);
    } else {
      setCurrentIndex(firstMissing);
    }
  }, [substrateChecks]);

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // After each substrate tx confirms, advance to next
  useEffect(() => {
    if (isConfirmed) {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= ALL_SUBSTRATE_CONFIGS.length) {
        setAllDone(true);
      } else {
        setCurrentIndex(nextIndex);
        resetWrite();
      }
    }
  }, [isConfirmed, currentIndex, resetWrite]);

  if (!enabled) {
    return (
      <StepRow number={5} label="Configure Substrates" status="pending" />
    );
  }

  if (allDone) {
    return (
      <StepRow
        number={5}
        label="Configure Substrates"
        status="done"
        detail={`${ALL_SUBSTRATE_CONFIGS.length}/${ALL_SUBSTRATE_CONFIGS.length} markets`}
      />
    );
  }

  const current = ALL_SUBSTRATE_CONFIGS[currentIndex];
  const status: StepStatus =
    isWriting || isConfirming ? 'loading' : writeError ? 'error' : 'pending';

  const handleConfigure = () => {
    if (!current) return;
    writeContract({
      address: vaultAddress,
      abi: plasmaVaultAbi,
      functionName: 'grantMarketSubstrates',
      args: [current.marketId, [...current.substrates]],
      chainId: CHAIN_ID,
    });
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={5}
        label="Configure Substrates"
        status={status}
        detail={
          isWriting
            ? `Configuring ${current?.label}... (${currentIndex + 1}/${ALL_SUBSTRATE_CONFIGS.length})`
            : isConfirming
              ? `Confirming ${current?.label}...`
              : `${currentIndex}/${ALL_SUBSTRATE_CONFIGS.length} markets configured`
        }
      />
      {status === 'pending' && (
        <Button onClick={handleConfigure} size="sm" className="w-full">
          Configure {current?.label} Substrates ({currentIndex + 1}/
          {ALL_SUBSTRATE_CONFIGS.length})
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
