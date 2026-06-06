'use client';

import { useAccount } from 'wagmi';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

import { useTreasuryPositions } from '../hooks/use-treasury-positions';
import { useMantleVaultsData, useYoPrices } from '../hooks/use-vaults-data';
import { PortfolioSummary } from './portfolio-summary';
import { AllocationTable } from './allocation-table';
import { TreasuryHistory } from './treasury-history';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function TreasuryDashboard({ chainId, vaultAddress }: Props) {
  const { address: userAddress } = useAccount();

  // PlasmaVault's positions in Mantle vaults + per-vault unallocated balances
  const {
    positions,
    isLoading: isPositionsLoading,
  } = useTreasuryPositions({
    chainId,
    treasuryAddress: vaultAddress,
  });

  // Mantle vault metadata (APR, TVL)
  const { data: vaultsData, isLoading: isVaultsLoading } =
    useMantleVaultsData(chainId);

  // Per-token USD prices from wgenie SDK
  const { data: prices } = useYoPrices(chainId);

  return (
    <div className="space-y-3 font-sans">
      {/* Portfolio stat cards */}
      <PortfolioSummary
        positions={positions}
        prices={prices ?? {}}
        isLoading={isPositionsLoading}
        chainId={chainId}
        vaultAddress={vaultAddress}
        userAddress={userAddress}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          {/* Allocation table with vault APR/TVL */}
          <AllocationTable
            chainId={chainId}
            positions={positions}
            vaultsData={vaultsData}
            prices={prices ?? {}}
            isLoading={isPositionsLoading || isVaultsLoading}
          />
        </div>
        <div className="space-y-3">
          {/* Recent activity from Ponder */}
          <TreasuryHistory treasuryAddress={vaultAddress} chainId={chainId} />
        </div>
      </div>
    </div>
  );
}
