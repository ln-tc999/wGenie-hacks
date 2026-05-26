'use client';

import type {
  VaultsResponse,
  VaultsMetadata,
  VaultSearchParams,
} from '@/vault-directory/fetch-vaults';
import { VaultDirectoryContent } from '@/vault-directory/vault-directory-content';
import { AppProviders } from '@/app/app-providers';

interface Props {
  initialData: VaultsResponse;
  metadata: VaultsMetadata;
  searchParams: VaultSearchParams;
}

export function VaultDirectoryServer({
  initialData,
  metadata,
  searchParams,
}: Props) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Vaults List
            </h1>
            <p className="text-muted-foreground">
              Browse and explore vaults
            </p>
          </div>
          <VaultDirectoryContent
            vaults={initialData.vaults}
            pagination={initialData.pagination}
            metadata={metadata}
            searchParams={searchParams}
          />
        </div>
      </div>
    </AppProviders>
  );
}
