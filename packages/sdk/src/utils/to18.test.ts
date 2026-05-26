import { describe, it, expect } from 'vitest';
import { to18 } from './to18';
import { DEFAULT_DECIMALS } from './constants';

describe('to18', () => {
  it('should return the same value when decimals equal DEFAULT_DECIMALS (18)', () => {
    const value = 1000000000000000000n; // 1e18
    const result = to18(value, DEFAULT_DECIMALS);

    expect(result).toBe(value);
  });

  it('should convert from 6 decimals to 18 decimals', () => {
    const value = 1000000n; // 1 token with 6 decimals
    const result = to18(value, 6);

    expect(result).toBe(1000000000000000000n); // 1e18
  });

  it('should convert from 8 decimals to 18 decimals', () => {
    const value = 100000000n; // 1 token with 8 decimals
    const result = to18(value, 8);

    expect(result).toBe(1000000000000000000n); // 1e18
  });

  it('should convert from 12 decimals to 18 decimals', () => {
    const value = 1000000000000n; // 1 token with 12 decimals
    const result = to18(value, 12);

    expect(result).toBe(1000000000000000000n); // 1e18
  });

  it('should handle zero values', () => {
    const value = 0n;
    const result = to18(value, 6);

    expect(result).toBe(0n);
  });

  it('should handle small values with 6 decimals', () => {
    const value = 1n; // smallest unit with 6 decimals
    const result = to18(value, 6);

    expect(result).toBe(1000000000000n); // 1e12
  });

  it('should handle large values', () => {
    const value = 999999999n; // large value with 6 decimals
    const result = to18(value, 6);

    expect(result).toBe(999999999000000000000n);
  });

  it('should work with different decimal values', () => {
    const testCases = [
      { value: 1n, decimals: 0, expected: 1000000000000000000n },
      { value: 10n, decimals: 1, expected: 1000000000000000000n },
      { value: 100n, decimals: 2, expected: 1000000000000000000n },
      { value: 1000n, decimals: 3, expected: 1000000000000000000n },
    ];

    testCases.forEach(({ value, decimals, expected }) => {
      const result = to18(value, decimals);
      expect(result).toBe(expected);
    });
  });
});
