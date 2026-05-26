import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';

interface Props {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

export const GlobalFlowChartTooltip = ({ active, payload, label }: Props) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => {
        const prefix =
          entry.name === 'Net Flow' && entry.value < 0 ? '-' : '';
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {prefix}${formatNumberWithSuffix(Math.abs(entry.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
};
