import { redirect } from 'next/navigation';

export default async function VaultDepositorsRedirect({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  redirect(`/cfo/vaults/${chainId}/${address}/depositors`);
}
