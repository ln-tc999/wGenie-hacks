import { describe, it } from 'node:test';
import { expect } from 'chai';
import { expectApproximately } from '../../lib/expect-approximately';

describe('expectApproximately', () => {
  it('should pass when values are exactly equal', () => {
    expectApproximately('100.123456789', '100.123456789');
  });

  it('should pass when values are within default tolerance (1e-6)', () => {
    // Difference of ~1e-7 relative (0.00001%)
    expectApproximately('100.00001', '100.00002');
  });

  it('should pass for small values within tolerance', () => {
    // Values from actual test cases
    expectApproximately('0.96541795700247080834', '0.96541795681879207991');
  });

  it('should pass for medium values within tolerance', () => {
    expectApproximately('1.17823490011589157261', '1.1782349000038071191');
  });

  it('should pass for large values within tolerance', () => {
    expectApproximately('903.2181401179139342043', '903.21814910320540603403');
  });

  it('should fail when values differ by more than tolerance', () => {
    expect(() => {
      expectApproximately('100', '101');
    }).to.throw();
  });

  it('should fail when values differ significantly', () => {
    expect(() => {
      expectApproximately('1.0', '1.1');
    }).to.throw();
  });

  it('should handle zero values', () => {
    expectApproximately('0', '0');
  });

  it('should handle negative values within tolerance', () => {
    expectApproximately('-100.00001', '-100.00002');
  });

  it('should fail for negative values outside tolerance', () => {
    expect(() => {
      expectApproximately('-100', '-101');
    }).to.throw();
  });

  it('should accept custom tolerance', () => {
    // This would fail with default tolerance but passes with 0.01 (1%)
    expectApproximately('100', '100.5', 0.01);
  });

  it('should fail with stricter custom tolerance', () => {
    expect(() => {
      // Would pass with default tolerance but fails with 1e-10
      expectApproximately('100.00001', '100.00002', 1e-10);
    }).to.throw();
  });

  it('should handle very small decimal values', () => {
    expectApproximately('0.000001', '0.0000010000001');
  });

  it('should handle scientific notation strings', () => {
    expectApproximately('1e-6', '0.000001');
  });
});
