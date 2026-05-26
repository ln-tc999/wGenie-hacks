import { Address, toHex } from 'viem';

export const generateSubAccountAddress = (
  primaryAddress: Address,
  subAccount: number,
): Address => {
  const primaryBigInt = BigInt(primaryAddress);
  const subAccountBigInt = BigInt(subAccount);
  const result = primaryBigInt ^ subAccountBigInt;
  return toHex(result, { size: 20 }) as Address;
};
