import {
  fetchActivity,
  fetchActivityInflows,
  type ActivitySearchParams,
} from '@/activity/fetch-activity';
import { VaultActivityContent } from '@/vault-details/components/vault-activity-content';

import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Vault Activity - ${getAppConfig().title}` };
}

interface PageProps {
  params: Promise<{
    chainId: string;
    address: string;
  }>;
  searchParams: Promise<{
    type?: string;
    min_amount?: string;
    depositor?: string;
  }>;
}

export default async function VaultActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { chainId: chainIdParam, address } = await params;
  const search = await searchParams;

  const vaultAddress = address.toLowerCase();

  // Build activity search params scoped to this vault
  const activityParams: ActivitySearchParams = {
    chains: chainIdParam,
    vaults: vaultAddress,
    type: search.type,
    min_amount: search.min_amount,
    depositor: search.depositor,
  };

  try {
    const [activityData, inflowsData] = await Promise.all([
      fetchActivity(activityParams),
      fetchActivityInflows(chainIdParam, vaultAddress),
    ]);

    return (
      <VaultActivityContent
        activities={activityData.activities}
        inflows={inflowsData}
        searchParams={activityParams}
        hasMore={activityData.pagination.hasMore}
        nextCursor={activityData.pagination.nextCursor}
      />
    );
  } catch {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Unable to load activity data. Please try again.
        </p>
      </div>
    );
  }
}
