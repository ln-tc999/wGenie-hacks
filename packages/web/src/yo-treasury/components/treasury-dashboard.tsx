'use client';

import { useAccount } from 'wagmi';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

import { useTreasuryPositions } from '../hooks/use-treasury-positions';
import { useYoVaultsData, useYoPrices } from '../hooks/use-yo-vaults-data';
import { PortfolioSummary } from './portfolio-summary';
import { AllocationTable } from './allocation-table';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function TreasuryDashboard({ chainId, vaultAddress }: Props) {
  const { address: userAddress } = useAccount();

  // PlasmaVault's positions in YO vaults + per-vault unallocated balances
  const {
    positions,
    isLoading: isPositionsLoading,
  } = useTreasuryPositions({
    chainId,
    treasuryAddress: vaultAddress,
  });

  // YO vault metadata (APR, TVL) via @yo-protocol/core
  const { data: vaultsData, isLoading: isVaultsLoading } =
    useYoVaultsData(chainId);

  // Per-token USD prices from YO SDK
  const { data: prices } = useYoPrices(chainId);

  return (
    <div className="space-y-3 font-yo">
      {/* Portfolio stat cards */}
      <PortfolioSummary
        positions={positions}
        prices={prices ?? {}}
        isLoading={isPositionsLoading}
        chainId={chainId}
        vaultAddress={vaultAddress}
        userAddress={userAddress}
      />

      {/* Allocation table with vault APR/TVL */}
      <AllocationTable
        chainId={chainId}
        positions={positions}
        vaultsData={vaultsData}
        prices={prices ?? {}}
        isLoading={isPositionsLoading || isVaultsLoading}
      />
    </div>
  );
}
