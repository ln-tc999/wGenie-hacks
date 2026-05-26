'use client';

import { useMemo, useCallback } from 'react';
import { ActivityDataTable } from '@/activity/components/activity-data-table';
import { ActivityScrollTrigger } from '@/activity/components/activity-scroll-trigger';
import { TotalInflows } from '@/activity/components/total-inflows';
import { FlowChart } from '@/flow-chart/flow-chart';
import { VaultActivityFilterBar } from './vault-activity-filter-bar';
import { useInfiniteActivity } from '@/activity/hooks/use-infinite-activity';
import type {
  ActivityItem,
  InflowsResponse,
  ActivitySearchParams,
} from '@/activity/fetch-activity';

interface Props {
  activities: ActivityItem[];
  inflows: InflowsResponse;
  searchParams: ActivitySearchParams;
  hasMore: boolean;
  nextCursor: string | null;
}

export function VaultActivityContent({
  activities: initialActivities,
  inflows,
  searchParams,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
}: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteActivity({
      params: searchParams,
      initialData: {
        activities: initialActivities,
        pagination: {
          nextCursor: initialNextCursor,
          hasMore: initialHasMore,
        },
      },
    });

  const allActivities = useMemo(() => {
    if (!data) return initialActivities;
    return data.pages.flatMap((page) => page.activities);
  }, [data, initialActivities]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="space-y-4">
      <FlowChart />
      {/* Header with filters and TotalInflows */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <VaultActivityFilterBar searchParams={searchParams} />
        <TotalInflows inflows={inflows.inflows} />
      </div>

      {/* Activity Table */}
      <ActivityDataTable activities={allActivities} />

      {/* Infinite Scroll Trigger */}
      <ActivityScrollTrigger
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage ?? false}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
