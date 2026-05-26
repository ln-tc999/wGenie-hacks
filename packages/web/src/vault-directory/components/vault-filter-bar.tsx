'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { NetFlowFilter } from './filters/net-flow-filter';
import { UnderlyingAssetFilter } from './filters/underlying-asset-filter';
import { ChainFilter } from './filters/chain-filter';
import { ProtocolFilter } from './filters/protocol-filter';
import type { VaultsMetadata } from '@/vault-directory/fetch-vaults';
import type { NetFlowOption } from '@/vault-directory/vault-directory.types';

interface Props {
  metadata: VaultsMetadata;
}

export function VaultFilterBar({ metadata }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const netFlow = (searchParams.get('net_flow') || 'all') as NetFlowOption;
  const assets =
    searchParams
      .get('underlying_assets')
      ?.split(',')
      .filter(Boolean) || [];
  const chains =
    searchParams
      .get('chains')
      ?.split(',')
      .filter(Boolean)
      .map(Number) || [];
  const protocols =
    searchParams
      .get('protocols')
      ?.split(',')
      .filter(Boolean) || [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete('page');
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <NetFlowFilter
        value={netFlow}
        onChange={(option) =>
          updateFilters({ net_flow: option === 'all' ? null : option })
        }
        className="w-auto"
      />
      <UnderlyingAssetFilter
        value={assets}
        onChange={(selected) =>
          updateFilters({
            underlying_assets:
              selected.length > 0 ? selected.join(',') : null,
          })
        }
        options={metadata.assets.map((a) => a.symbol)}
        className="w-auto"
      />
      <ChainFilter
        value={chains}
        onChange={(selected) =>
          updateFilters({
            chains: selected.length > 0 ? selected.join(',') : null,
          })
        }
        options={metadata.chains}
        className="w-auto"
      />
      <ProtocolFilter
        value={protocols}
        onChange={(selected) =>
          updateFilters({
            protocols: selected.length > 0 ? selected.join(',') : null,
          })
        }
        options={metadata.protocols}
        className="w-auto"
      />
    </div>
  );
}
