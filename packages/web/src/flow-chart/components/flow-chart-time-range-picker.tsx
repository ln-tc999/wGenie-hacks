import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  TIME_RANGE_OPTIONS,
  type TimeRange,
} from '@/flow-chart/flow-chart.types';

interface Props {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
}

export const FlowChartTimeRangePicker = ({ value, onValueChange }: Props) => {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onValueChange(newValue as TimeRange);
        }
      }}
      className="justify-start"
    >
      {TIME_RANGE_OPTIONS.map((option) => (
        <ToggleGroupItem key={option} value={option} className="text-sm w-16">
          {option.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
