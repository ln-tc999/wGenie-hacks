'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface Props {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function ActivityScrollTrigger({ onLoadMore, hasMore, isLoading }: Props) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (!hasMore && !isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No more activities to load
      </div>
    );
  }

  return (
    <div ref={ref} className="h-16 flex items-center justify-center">
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
    </div>
  );
}
