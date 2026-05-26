import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FlowChartNoData = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flow Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">
            No data available for the selected time range
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
