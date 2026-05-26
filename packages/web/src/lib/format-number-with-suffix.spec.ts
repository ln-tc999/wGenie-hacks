import { expect, it } from 'vitest';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';

it('formatNumberWithSuffix', () => {
  expect(formatNumberWithSuffix(0)).toBe('0');
  expect(formatNumberWithSuffix(-0)).toBe('0');

  expect(formatNumberWithSuffix(1)).toBe('1.00');
  expect(formatNumberWithSuffix(999)).toBe('999');
  expect(formatNumberWithSuffix(1000)).toBe('1.00K');
  expect(formatNumberWithSuffix(999_400)).toBe('999K');
  expect(formatNumberWithSuffix(1_000_000)).toBe('1.00M');
  expect(formatNumberWithSuffix(999_400_000)).toBe('999M');
  expect(formatNumberWithSuffix(1_000_000_000)).toBe('1.00B');
  expect(formatNumberWithSuffix(999_400_000_000)).toBe('999B');
  expect(formatNumberWithSuffix(1_000_000_000_000)).toBe('1.00T');
  expect(formatNumberWithSuffix(1_543_340_000_000)).toBe('1.54T');
  expect(formatNumberWithSuffix(14_543_340_000_000)).toBe('14.5T');
  expect(formatNumberWithSuffix(614_543_340_000_000)).toBe('615T');
  expect(formatNumberWithSuffix(3_614_543_340_000_000)).toBe('3615T');

  expect(formatNumberWithSuffix(-654_532)).toBe('-655K');
  expect(formatNumberWithSuffix(-4_654_532)).toBe('-4.65M');
  expect(formatNumberWithSuffix(53_336.6712)).toBe('53.3K');

  expect(formatNumberWithSuffix(Infinity)).toBe('0');
  expect(formatNumberWithSuffix(-Infinity)).toBe('0');
  expect(formatNumberWithSuffix(NaN)).toBe('0');
});
