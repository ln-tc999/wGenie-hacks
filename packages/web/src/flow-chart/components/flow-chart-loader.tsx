import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FlowChartLoader = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flow Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </CardContent>
    </Card>
  );
};
