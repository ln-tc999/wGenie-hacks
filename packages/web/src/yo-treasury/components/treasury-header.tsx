'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { ChainIcon } from '@/components/chain-icon';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  vaultName: string;
}

export function TreasuryHeader({ chainId, vaultAddress, vaultName }: Props) {
  return (
    <header className="border-b border-white/5 bg-yo-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Home link + vault identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-yo-muted hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ChainIcon chainId={chainId} className="w-5 h-5" />
            <h1 className="text-sm font-semibold tracking-tight text-white">
              {vaultName}
            </h1>
          </div>
        </div>

        {/* Right: Vault address */}
        <BlockExplorerAddress
          chainId={chainId}
          address={vaultAddress}
          visibleDigits={4}
        />
      </div>
    </header>
  );
}
