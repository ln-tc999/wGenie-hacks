import { redirect } from 'next/navigation';

export default async function VaultAlphaRedirect({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;
  // Alpha chat is now at /cfo/agent
  redirect(`/cfo/agent`);
}
