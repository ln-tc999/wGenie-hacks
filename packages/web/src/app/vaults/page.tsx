import {
  fetchVaults,
  fetchVaultsMetadata,
  type VaultSearchParams,
} from '@/vault-directory/fetch-vaults';
import { VaultDirectoryServer } from './vault-directory-server';
import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Vaults List - ${getAppConfig().title}` };
}

interface PageProps {
  searchParams: Promise<VaultSearchParams>;
}

export default async function VaultsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  try {
    const [vaultsData, vaultsMetadata] = await Promise.all([
      fetchVaults(params),
      fetchVaultsMetadata(),
    ]);

    return (
      <VaultDirectoryServer
        initialData={vaultsData}
        metadata={vaultsMetadata}
        searchParams={params}
      />
    );
  } catch {
    return (
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
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Unable to connect to the API server. Please ensure the backend is
              running and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
