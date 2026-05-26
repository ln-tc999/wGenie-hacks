import {
  fetchActivity,
  fetchActivityInflows,
  fetchActivityMetadata,
  type ActivitySearchParams,
} from '@/activity/fetch-activity';
import { ActivityServer } from './activity-server';

import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Activity - ${getAppConfig().title}` };
}

interface PageProps {
  searchParams: Promise<ActivitySearchParams>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams;

  try {
    const [activityData, inflowsData, metadataData] = await Promise.all([
      fetchActivity(params),
      fetchActivityInflows(params.chains),
      fetchActivityMetadata(),
    ]);

    return (
      <ActivityServer
        initialData={activityData}
        inflows={inflowsData}
        metadata={metadataData}
        searchParams={params}
      />
    );
  } catch {
    return (
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Activity
            </h1>
            <p className="text-muted-foreground">
              Deposits and withdrawals across vaults
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
