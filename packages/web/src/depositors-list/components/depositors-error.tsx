import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const DepositorsError = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Depositors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Failed to load depositors
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error loading the depositors data. Please try again
            later.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
