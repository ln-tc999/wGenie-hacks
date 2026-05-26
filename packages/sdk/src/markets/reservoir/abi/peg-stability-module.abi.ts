import { Abi } from 'viem';

export const pegStabilityModuleAbi = [
  {
    type: 'function',
    name: 'redeem',
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
