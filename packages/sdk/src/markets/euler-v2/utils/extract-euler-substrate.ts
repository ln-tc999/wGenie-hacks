import { Address, getAddress, Hex } from 'viem';

export interface EulerSubstrate {
  eulerVault: Address;
  isCollateral: boolean;
  canBorrow: boolean;
  subAccount: number;
}

export const extractEulerSubstrate = (rawSubstrate: Hex): EulerSubstrate => {
  const hexString = rawSubstrate.slice(2);
  const eulerVault = getAddress(`0x${hexString.slice(0, 40)}`);
  const isCollateral = Boolean(parseInt(hexString.slice(40, 42), 16));
  const canBorrow = Boolean(parseInt(hexString.slice(42, 44), 16));
  const subAccount = parseInt(hexString.slice(44, 46), 16);
  return { eulerVault, isCollateral, canBorrow, subAccount };
};
