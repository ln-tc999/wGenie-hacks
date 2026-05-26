import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const DepositorsChartSkeleton = () => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[300px] flex items-center justify-center">
          <Skeleton className="h-64 w-64 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
};
