'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

import { useTreasuryPositions } from '../hooks/use-treasury-positions';
import { useMantleVaultsData, useYoPrices } from '../hooks/use-vaults-data';
import { PortfolioSummary } from './portfolio-summary';
import { AllocationTable } from './allocation-table';
import { TreasuryHistory } from './treasury-history';
import { GuardrailsSettings } from './guardrails-settings';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function TreasuryDashboard({ chainId, vaultAddress }: Props) {
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

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
    <div className="space-y-4 font-sans">
      {/* Portfolio stat cards */}
      <PortfolioSummary
        positions={positions}
        prices={prices ?? {}}
        isLoading={isPositionsLoading}
        chainId={chainId}
        vaultAddress={vaultAddress}
        userAddress={userAddress}
      />

      {/* Navigation tabs */}
      <div className="flex border-b border-white/5 pb-1 gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-wgenie-muted hover:text-white'
          }`}
        >
          Overview & Yield
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-wgenie-muted hover:text-white'
          }`}
        >
          Guardrails & Settings
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            {/* Allocation table with vault APR/TVL */}
            <AllocationTable
              chainId={chainId}
              positions={positions}
              vaultsData={vaultsData ? Object.values(vaultsData) : undefined}
              prices={prices ?? {}}
              isLoading={isPositionsLoading || isVaultsLoading}
            />
          </div>
          <div className="space-y-3">
            {/* Recent activity from Ponder */}
            <TreasuryHistory treasuryAddress={vaultAddress} chainId={chainId} />
          </div>
        </div>
      ) : (
        <GuardrailsSettings chainId={chainId} vaultAddress={vaultAddress} />
      )}
    </div>
  );
}
