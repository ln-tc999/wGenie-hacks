import { describe, it, expect, expectTypeOf } from 'vitest';
import { truncateHex } from './truncate-hex';

describe('truncateHex', () => {
  describe('valid inputs', () => {
    it('should truncate a standard Ethereum address with default visible digits', () => {
      const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const result = truncateHex(address);
      expect(result).toBe('0x8335...2913');
    });

    it('should truncate with custom visible digits', () => {
      const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const result = truncateHex(address, 6);
      expect(result).toBe('0x833589...A02913');
    });

    it('should truncate with 1 visible digit', () => {
      const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const result = truncateHex(address, 1);
      expect(result).toBe('0x8...3');
    });

    it('should return original address when hex part is too short', () => {
      const hex = '0x123456';
      const result = truncateHex(hex, 4);
      expect(result).toBe('0x123456');
    });

    it('should return original address when hex part equals twice visible digits', () => {
      const hex = '0x12345678';
      const result = truncateHex(hex, 4);
      expect(result).toBe('0x12345678');
    });

    it('should handle addresses with mixed case', () => {
      const hex = '0xAbCdEf1234567890abcdef1234567890ABCDEF12';
      const result = truncateHex(hex, 3);
      expect(result).toBe('0xAbC...F12');
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid hex string', () => {
      const hex = '0x12';
      const result = truncateHex(hex, 1);
      expect(result).toBe('0x12');
    });

    it('should handle exactly twice visible digits', () => {
      const hex = '0x12345678';
      const result = truncateHex(hex, 4);
      expect(result).toBe('0x12345678');
    });

    it('should handle very long addresses', () => {
      const hex = '0x' + '1'.repeat(100);
      const result = truncateHex(hex, 5);
      expect(result).toBe('0x11111...11111');
    });
  });

  describe('error cases', () => {
    it('should throw error for empty string', () => {
      expect(() => truncateHex('')).toThrow(
        'Address must be a non-empty string',
      );
    });

    it('should throw error for null input', () => {
      expect(() => truncateHex(null as never)).toThrow(
        'Address must be a non-empty string',
      );
    });

    it('should throw error for undefined input', () => {
      expect(() => truncateHex(undefined as never)).toThrow(
        'Address must be a non-empty string',
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => truncateHex(123 as never)).toThrow(
        'Address must be a non-empty string',
      );
    });

    it('should throw error for address without 0x prefix', () => {
      expect(() =>
        truncateHex('833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
      ).toThrow('Address must start with "0x"');
    });

    it('should throw error for address with wrong prefix', () => {
      expect(() =>
        truncateHex('0X833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
      ).toThrow('Address must start with "0x"');
    });

    it('should throw error for zero visible digits', () => {
      const hex = '0x1234567890';
      expect(() => truncateHex(hex, 0)).toThrow(
        'Visible digits must be at least 1',
      );
    });

    it('should throw error for negative visible digits', () => {
      const hex = '0x1234567890';
      expect(() => truncateHex(hex, -1)).toThrow(
        'Visible digits must be at least 1',
      );
    });
  });

  describe('type safety', () => {
    it('should have correct return type', () => {
      const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const result = truncateHex(address);
      expectTypeOf(result).toBeString();
    });

    it('should accept valid parameters', () => {
      const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const visibleDigits = 4;

      // This should compile without errors
      const result = truncateHex(address, visibleDigits);
      expect(result).toBe('0x8335...2913');
    });
  });
});
