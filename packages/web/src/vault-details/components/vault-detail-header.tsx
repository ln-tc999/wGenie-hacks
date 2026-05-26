'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import { VaultDetailTabs } from './vault-detail-tabs';
import { useVaultContext } from '@/vault/vault.context';
import { getDebankProfileUrl } from '@/lib/get-debank-profile-url';
import { getChainName } from '@/lib/vaults-registry';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
}

export const VaultDetailHeader = ({
  chainId,
  vaultAddress,
  vaultName,
  protocol,
}: Props) => {
  const { name: onChainName, asset } = useVaultContext();

  const displayName = vaultName || onChainName || 'Vault';
  const displayProtocol = protocol || 'Unknown';
  const debankUrl = getDebankProfileUrl(vaultAddress);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/vaults">Vaults</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Vault Identity */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {/* Title row with icons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ChainIcon chainId={chainId} className="w-7 h-7" />
              <TokenIcon chainId={chainId} address={asset} className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Protocol:{' '}
              <span className="text-foreground font-medium">
                {displayProtocol}
              </span>
            </span>
            <span>
              Chain:{' '}
              <span className="text-foreground font-medium">
                {getChainName(chainId)}
              </span>
            </span>
          </div>
        </div>

        {/* External links */}
        <div className="flex items-center gap-3">
          <BlockExplorerAddress
            chainId={chainId}
            address={vaultAddress}
            visibleDigits={6}
          />
          <a
            href={debankUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="View on DeBank"
          >
            <Image
              src="/assets/debank-icon.svg"
              alt="DeBank"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="hidden sm:inline">DeBank</span>
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <VaultDetailTabs chainId={chainId} vaultAddress={vaultAddress} />
    </div>
  );
};
