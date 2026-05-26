'use client';

import { ActivityContent } from '@/activity/activity-content';
import { TotalInflows } from '@/activity/components/total-inflows';
import { AppProviders } from '@/app/app-providers';
import type {
  ActivityResponse,
  InflowsResponse,
  ActivityMetadata,
  ActivitySearchParams,
} from '@/activity/fetch-activity';

interface Props {
  initialData: ActivityResponse;
  inflows: InflowsResponse;
  metadata: ActivityMetadata;
  searchParams: ActivitySearchParams;
}

export function ActivityServer({
  initialData,
  inflows,
  metadata,
  searchParams,
}: Props) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Activity</h1>
              <p className="text-muted-foreground">
                Track deposits and withdrawals across vaults
              </p>
            </div>
            <TotalInflows inflows={inflows.inflows} />
          </div>

          {/* Content */}
          <ActivityContent
            activities={initialData.activities}
            metadata={metadata}
            searchParams={searchParams}
            hasMore={initialData.pagination.hasMore}
            nextCursor={initialData.pagination.nextCursor}
          />
        </div>
      </div>
    </AppProviders>
  );
}
