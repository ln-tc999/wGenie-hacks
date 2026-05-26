import { describe, expect, it } from 'vitest';
import { isSubstrateEqualSafe } from './is-substrate-equal-safe';

describe('isSubstrateEqualSafe', () => {
  it('should return false if substrates are different', () => {
    const substrate1 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 =
      '0x0000000000000000000000000000000000000000000000001234567890abcdef';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(false);
  });

  it('should return true if substrates are equal', () => {
    const substrate1 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(true);
  });

  it('should return true if substrates are equal but trimmed on left', () => {
    const substrate1 = '0xdef171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(true);
  });

  it('should return true if substrates are equal but different case', () => {
    const substrate1 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 =
      '0x000000000000000000000000DEF171FE48CF0115B1D80B88DC8EAB59176FEE57';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(true);
  });

  it('should return true if substrates are same addresses but different case', () => {
    const substrate1 = '0xdef171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 = '0xDEF171FE48CF0115B1D80B88DC8EAB59176FEE57';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(true);
  });

  it('should return true if substrates are same addresses but different padding', () => {
    const substrate1 = '0xdef171fe48cf0115b1d80b88dc8eab59176fee57';
    const substrate2 =
      '0x000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57';
    const result = isSubstrateEqualSafe(substrate1, substrate2);
    expect(result).toBe(true);
  });
});
