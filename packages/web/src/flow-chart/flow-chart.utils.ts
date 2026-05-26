import type { TimeRange } from './flow-chart.types';

export const formatChartDate = (date: Date, timeRange: TimeRange): string => {
  if (timeRange === '7d') {
    return date.toLocaleDateString('en-US', {
      hour: 'numeric',
      day: 'numeric',
      month: 'short',
    });
  }

  if (timeRange === '30d') {
    return date.toLocaleDateString('en-US', {
      hour: 'numeric',
      day: 'numeric',
      month: 'short',
    });
  }

  if (timeRange === '90d') {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const CHART_COLORS = {
  inflow: '#22c55e',
  outflow: '#ef4444',
  netFlow: '#3b82f6',
} as const;

export const CHART_CONFIG = {
  margin: {
    top: 20,
    right: 10,
    left: 0,
    bottom: 5,
  },
  strokeWidth: 2,
  dotRadius: 4,
  activeDotRadius: 6,
  strokeDasharray: '3 3',
} as const;
