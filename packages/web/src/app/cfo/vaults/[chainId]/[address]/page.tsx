import { VaultOverviewContent } from '@/vault-details/components/vault-overview-content';
import { getVaultFromRegistry } from '@/lib/vaults-registry';
import { TreasuryOverview } from '@/wgenie-cfo/components/treasury-overview';
import { MantleVaultOverview } from '@/wgenie-cfo/components/vault-overview';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';
import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Vault Overview - ${getAppConfig().title}` };
}

export default async function CfoVaultOverviewPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  const vault = getVaultFromRegistry(Number(chainId), address);

  if (vault?.tags.includes('wgenie-cfo')) {
    return (
      <div className="space-y-6">
        <TreasuryOverview
          chainId={Number(chainId) as ChainId}
          vaultAddress={address as Address}
        />
      </div>
    );
  }

  const isMantleVault = vault?.tags.includes('wgenie-vault');

  return (
    <div className="space-y-6">
      <VaultOverviewContent />
      {isMantleVault && (
        <MantleVaultOverview
          chainId={Number(chainId) as ChainId}
          vaultAddress={address as Address}
        />
      )}
    </div>
  );
}
