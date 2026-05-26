import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

export const VaultMetricsItem = ({
  title,
  value,
  description,
  icon,
}: Props) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
