import type { Address, GetEnsNameReturnType } from 'viem';

export const getAvatarFallback = (
  ensName: GetEnsNameReturnType | undefined,
  address: Address,
) => {
  return ensName
    ? ensName.slice(0, 2).toUpperCase()
    : address.slice(2, 4).toUpperCase();
};
