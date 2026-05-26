'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getVisibleTabs } from '@/vault-details/vault-tabs.config';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export const VaultDetailTabs = ({ chainId, vaultAddress }: Props) => {
  const pathname = usePathname();
  const basePath = `/vaults/${chainId}/${vaultAddress}`;
  const visibleTabs = getVisibleTabs();

  const getTabHref = (tabId: string) => {
    return tabId === 'overview' ? basePath : `${basePath}/${tabId}`;
  };

  const isActive = (tabId: string) => {
    if (tabId === 'overview') {
      return pathname === basePath;
    }
    return pathname === `${basePath}/${tabId}`;
  };

  return (
    <nav className="border-b border-border">
      <div className="flex overflow-x-auto -mb-px">
        {visibleTabs.map(({ id, label }) => (
          <Link
            key={id}
            href={getTabHref(id)}
            className={cn(
              'inline-flex items-center whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive(id)
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
