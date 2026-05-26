import { Abi } from 'viem';

export const stEthAbi = [
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi;
