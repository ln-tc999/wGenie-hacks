import { formatSignificant } from '@/lib/format-significant';
import { formatCurrency } from '@/lib/utils';
import { useVaultContext } from '@/vault/vault.context';
import { parseUnits } from 'viem';

interface Props {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
  }[];
  label?: string;
}

export const FlowChartTooltip = ({ active, payload, label }: Props) => {
  const { assetDecimals } = useVaultContext();

  if (assetDecimals === undefined) return null;

  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry, index) => {
          const absValue = Math.abs(entry.value);
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
                {prefix}
                {formatSignificant(
                  parseUnits(absValue.toString(), assetDecimals),
                  assetDecimals,
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};
