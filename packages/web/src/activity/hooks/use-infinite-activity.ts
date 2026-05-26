'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchActivityClient } from '../fetch-activity-client';
import type { ActivitySearchParams, ActivityItem } from '../fetch-activity';

interface UseInfiniteActivityOptions {
  params: ActivitySearchParams;
  initialData?: {
    activities: ActivityItem[];
    pagination: {
      nextCursor: string | null;
      hasMore: boolean;
    };
  };
}

export function useInfiniteActivity({
  params,
  initialData,
}: UseInfiniteActivityOptions) {
  return useInfiniteQuery({
    queryKey: ['activity', params],
    queryFn: ({ pageParam }) => fetchActivityClient(params, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30 * 1000, // 30 seconds
    initialData: initialData
      ? {
          pages: [initialData],
          pageParams: [undefined],
        }
      : undefined,
  });
}
