import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const DepositorsChartError = () => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Depositors Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Failed to load depositors chart
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
