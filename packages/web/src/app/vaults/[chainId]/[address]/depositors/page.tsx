import { VaultDepositorsContent } from '@/vault-details/components/vault-depositors-content';

import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Vault Depositors - ${getAppConfig().title}` };
}

export default function VaultDepositorsPage() {
  return <VaultDepositorsContent />;
}
