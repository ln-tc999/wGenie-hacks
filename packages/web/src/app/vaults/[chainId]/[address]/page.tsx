import { VaultOverviewContent } from '@/vault-details/components/vault-overview-content';
import { getVaultFromRegistry } from '@/lib/vaults-registry';
import { YoTreasuryOverview } from '@/yo-treasury/components/yo-treasury-overview';
import { YoVaultOverview } from '@/yo-treasury/components/yo-vault-overview';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Vault Overview - ${getAppConfig().title}` };
}

export default async function VaultOverviewPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  const vault = getVaultFromRegistry(Number(chainId), address);

  if (vault?.tags.includes('yo-treasury')) {
    return (
      <YoTreasuryOverview
        chainId={Number(chainId) as ChainId}
        vaultAddress={address as Address}
      />
    );
  }

  const isYoVault = vault?.tags.includes('yo-vault');

  return (
    <div className="space-y-6">
      <VaultOverviewContent />
      {isYoVault && (
        <YoVaultOverview
          chainId={Number(chainId) as ChainId}
          vaultAddress={address as Address}
        />
      )}
    </div>
  );
}
