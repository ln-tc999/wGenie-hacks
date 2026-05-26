export const TIME_RANGE_OPTIONS = ['7d', '30d', '90d', '1y'] as const;

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

export interface FlowChartDataItem {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}
