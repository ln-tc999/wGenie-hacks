import { Hex, trim } from 'viem';

export const isSubstrateEqualSafe = (
  substrate1: Hex | undefined,
  substrate2: Hex | undefined,
) => {
  if (!substrate1 || !substrate2) {
    return false;
  }

  return _parseHex(substrate1) === _parseHex(substrate2);
};

const _parseHex = (hex: Hex) => {
  return trim(hex).toLowerCase();
};
