import { expect } from 'chai';

/**
 * Assert that two formatted decimal values are approximately equal.
 * Useful for blockchain tests where small rounding differences can occur
 * between different environments (local vs CI, different RPC providers, etc.)
 *
 * @param actual - The actual value as a formatted string
 * @param expected - The expected value as a formatted string
 * @param relativeTolerance - The relative tolerance (default: 1e-6 = 0.0001%)
 */
export const expectApproximately = (
  actual: string,
  expected: string,
  relativeTolerance = 1e-6,
) => {
  const actualNum = parseFloat(actual);
  const expectedNum = parseFloat(expected);
  const tolerance = Math.abs(expectedNum) * relativeTolerance;

  expect(actualNum).to.be.closeTo(expectedNum, tolerance);
};
