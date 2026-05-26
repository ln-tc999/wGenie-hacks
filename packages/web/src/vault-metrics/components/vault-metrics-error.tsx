import { Card, CardContent } from '@/components/ui/card';

export const VaultMetricsError = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Failed to load vault metrics. Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
