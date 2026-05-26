import { Abi } from 'viem';

export const creditEnforcerAbi = [
  {
    type: 'function',
    name: 'mintStablecoin',
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
