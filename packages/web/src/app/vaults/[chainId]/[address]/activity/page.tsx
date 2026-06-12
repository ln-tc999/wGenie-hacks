import { redirect } from 'next/navigation';

export default async function VaultActivityRedirect({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  redirect(`/cfo/vaults/${chainId}/${address}/activity`);
}
