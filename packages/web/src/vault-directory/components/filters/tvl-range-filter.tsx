import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { TVLRange } from '@/vault-directory/vault-directory.types';
import {
  MIN_TVL_VALUE,
  validateTVLRange,
  valueToLogSlider,
  logSliderToValue,
  formatCompactNumber,
} from '@/vault-directory/vault-directory.utils';

interface Props {
  value: TVLRange | null;
  onChange: (range: TVLRange | null) => void;
  min?: number;
  max: number; // From metadata
}

export const TVLRangeFilter = ({
  value,
  onChange,
  min = MIN_TVL_VALUE,
  max,
}: Props) => {
  // Convert current TVL range to slider values (logarithmic)
  const sliderValue = useMemo(() => {
    if (!value) return [0, 100];
    return [
      Math.max(0, valueToLogSlider(value.min, min, max)),
      Math.min(100, valueToLogSlider(value.max, min, max)),
    ];
  }, [value, min, max]);

  const handleSliderChange = (newValues: number[]) => {
    const [sliderMin, sliderMax] = newValues;

    // Convert slider values back to TVL values (logarithmic)
    const tvlMin = logSliderToValue(sliderMin, min, max);
    const tvlMax = logSliderToValue(sliderMax, min, max);

    // Ensure min doesn't exceed max
    const finalMin = Math.min(tvlMin, tvlMax);
    const finalMax = Math.max(tvlMin, tvlMax);

    const range = { min: finalMin, max: finalMax };

    if (validateTVLRange(range, max)) {
      onChange(range);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const getDisplayText = (): string => {
    const minValue = value ? value.min : min;
    const maxValue = value ? value.max : max;
    if (minValue === min && maxValue === max) {
      return 'All TVL ranges';
    }
    return `${formatCompactNumber(minValue)} - ${formatCompactNumber(maxValue)}`;
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
        <span>{formatCompactNumber(min)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <span>{formatCompactNumber(max)}</span>
      </div>

      <div className="text-sm text-center text-foreground bg-muted px-3 py-2 rounded-md">
        {getDisplayText()}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Logarithmic scale for better precision
      </p>
    </div>
  );
};
