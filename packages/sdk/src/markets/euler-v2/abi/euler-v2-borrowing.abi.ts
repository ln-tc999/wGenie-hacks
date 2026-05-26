import { Abi } from 'viem';

export const eulerV2BorrowingAbi = [
  {
    type: 'function',
    name: 'debtOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const satisfies Abi;
