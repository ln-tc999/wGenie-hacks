import { describe, it, expect } from 'vitest';
import { formatChartDate } from './flow-chart.utils';

describe('formatChartDate', () => {
  const testDate = new Date('2024-01-15T14:30:00Z'); // January 15, 2024, 2:30 PM UTC

  it('should format date for 7d timeRange with hour, day and month', () => {
    const result = formatChartDate(testDate, '7d');
    expect(result).toBe('Jan 15, 3 PM');
  });

  it('should format date for 30d timeRange with hour, day and month', () => {
    const result = formatChartDate(testDate, '30d');
    expect(result).toBe('Jan 15, 3 PM');
  });

  it('should format date for 90d timeRange with day and month only', () => {
    const result = formatChartDate(testDate, '90d');
    expect(result).toBe('Jan 15');
  });

  it('should format date for 1y timeRange with day, month and year', () => {
    const result = formatChartDate(testDate, '1y');
    expect(result).toBe('Jan 15, 2024');
  });

  it('should handle edge case of different timeRange values', () => {
    // Test with a date at year boundary
    const yearEndDate = new Date('2023-12-31T23:59:59Z');

    expect(formatChartDate(yearEndDate, '7d')).toBe('Jan 1, 12 AM');
    expect(formatChartDate(yearEndDate, '30d')).toBe('Jan 1, 12 AM');
    expect(formatChartDate(yearEndDate, '90d')).toBe('Jan 1');
    expect(formatChartDate(yearEndDate, '1y')).toBe('Jan 1, 2024');
  });

  it('should handle midnight hour formatting', () => {
    const midnightDate = new Date('2024-01-15T00:00:00Z');

    expect(formatChartDate(midnightDate, '7d')).toBe('Jan 15, 1 AM');
    expect(formatChartDate(midnightDate, '30d')).toBe('Jan 15, 1 AM');
  });

  it('should handle noon hour formatting', () => {
    const noonDate = new Date('2024-01-15T12:00:00Z');

    expect(formatChartDate(noonDate, '7d')).toBe('Jan 15, 1 PM');
    expect(formatChartDate(noonDate, '30d')).toBe('Jan 15, 1 PM');
  });

  it('should handle various months correctly', () => {
    const dates = [
      { date: new Date('2024-01-01T00:00:00Z'), expected: 'Jan 1' },
      { date: new Date('2024-02-29T00:00:00Z'), expected: 'Feb 29' },
      { date: new Date('2024-12-25T12:00:00Z'), expected: 'Dec 25' },
    ];

    dates.forEach(({ date, expected }) => {
      expect(formatChartDate(date, '90d')).toBe(expected);
    });
  });
});
