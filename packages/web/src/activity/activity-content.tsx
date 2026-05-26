'use client';

import { useMemo, useCallback } from 'react';
import { ActivityDataTable } from './components/activity-data-table';
import { ActivityFilterBar } from './components/activity-filter-bar';
import { ActivityScrollTrigger } from './components/activity-scroll-trigger';
import { useInfiniteActivity } from './hooks/use-infinite-activity';
import type {
  ActivityItem,
  ActivityMetadata,
  ActivitySearchParams,
} from './fetch-activity';

interface Props {
  activities: ActivityItem[];
  metadata: ActivityMetadata;
  searchParams: ActivitySearchParams;
  hasMore: boolean;
  nextCursor: string | null;
}

export function ActivityContent({
  activities: initialActivities,
  metadata,
  searchParams,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
}: Props) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivity({
    params: searchParams,
    initialData: {
      activities: initialActivities,
      pagination: {
        nextCursor: initialNextCursor,
        hasMore: initialHasMore,
      },
    },
  });

  // Flatten all pages into a single array
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
      {/* Filter Bar */}
      <ActivityFilterBar metadata={metadata} searchParams={searchParams} />

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
