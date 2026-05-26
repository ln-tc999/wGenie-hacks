import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { DepositorRange } from '@/vault-directory/vault-directory.types';
import {
  valueToLogSlider,
  logSliderToValue,
  formatCompactCount,
} from '@/vault-directory/vault-directory.utils';

interface Props {
  value: DepositorRange | null;
  onChange: (range: DepositorRange | null) => void;
  max: number; // From metadata
}

export const DepositorCountFilter = ({ value, onChange, max }: Props) => {
  const min = 0;

  // Convert current range to slider values (logarithmic)
  const sliderValue = useMemo(() => {
    if (!value) return [0, 100];
    return [
      Math.max(0, valueToLogSlider(value.min, min, max)),
      Math.min(100, valueToLogSlider(value.max, min, max)),
    ];
  }, [value, min, max]);

  const handleSliderChange = (newValues: number[]) => {
    const [sliderMin, sliderMax] = newValues;

    const depMin = Math.round(logSliderToValue(sliderMin, min, max));
    const depMax = Math.round(logSliderToValue(sliderMax, min, max));

    const finalMin = Math.min(depMin, depMax);
    const finalMax = Math.max(depMin, depMax);

    // Generate label for URL persistence
    const label = `${finalMin}-${finalMax === max ? 'max' : finalMax}`;

    onChange({ min: finalMin, max: finalMax, label });
  };

  const handleClear = () => {
    onChange(null);
  };

  const getDisplayText = (): string => {
    if (!value) return 'All depositor counts';
    const minText = formatCompactCount(value.min);
    const maxText =
      value.max >= max
        ? `${formatCompactCount(max)}+`
        : formatCompactCount(value.max);
    return `${minText} - ${maxText} depositors`;
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground gap-2">
        <span>{formatCompactCount(min)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <span>{formatCompactCount(max)}</span>
      </div>

      <div className="text-sm text-center text-foreground bg-muted px-3 py-2 rounded-md">
        {getDisplayText()}
      </div>
    </div>
  );
};
