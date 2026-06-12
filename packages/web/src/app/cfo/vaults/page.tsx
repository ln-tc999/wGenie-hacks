import {
  fetchVaults,
  fetchVaultsMetadata,
  type VaultSearchParams,
} from '@/vault-directory/fetch-vaults';
import { VaultDirectoryContent } from '@/vault-directory/vault-directory-content';

interface PageProps {
  searchParams: Promise<VaultSearchParams>;
}

export default async function CfoVaultsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  try {
    const [vaultsData, vaultsMetadata] = await Promise.all([
      fetchVaults(params),
      fetchVaultsMetadata(),
    ]);

    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Vaults</h2>
          <p className="mt-1 text-sm text-[#8E8E8E]">
            Browse and explore vaults
          </p>
        </div>
        <VaultDirectoryContent
          vaults={vaultsData.vaults}
          pagination={vaultsData.pagination}
          metadata={vaultsMetadata}
          searchParams={params}
        />
      </div>
    );
  } catch {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="flex items-center justify-center rounded-lg border border-[#262626] bg-[#141414] p-12 text-sm text-[#8E8E8E]">
          Unable to connect to the API server. Please ensure the backend is running and try again.
        </div>
      </div>
    );
  }
}
