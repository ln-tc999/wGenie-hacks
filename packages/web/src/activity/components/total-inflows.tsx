'use client';

import type { InflowsResponse } from '../fetch-activity';

interface Props {
  inflows: InflowsResponse['inflows'];
}

function formatCompactCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function getColorClass(value: number): string {
  return value >= 0 ? 'text-green-500' : 'text-red-500';
}

export function TotalInflows({ inflows }: Props) {
  return (
    <div className="flex items-center gap-6 text-sm">
      <span className="text-muted-foreground">Total Inflows</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">1D</span>
          <span className={`font-medium ${getColorClass(inflows.day1.net)}`}>
            {formatCompactCurrency(inflows.day1.net)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">7D</span>
          <span className={`font-medium ${getColorClass(inflows.day7.net)}`}>
            {formatCompactCurrency(inflows.day7.net)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">30D</span>
          <span className={`font-medium ${getColorClass(inflows.day30.net)}`}>
            {formatCompactCurrency(inflows.day30.net)}
          </span>
        </div>
      </div>
    </div>
  );
}
