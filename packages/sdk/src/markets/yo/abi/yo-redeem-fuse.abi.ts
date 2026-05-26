import { Abi } from 'viem';

export const yoRedeemFuseAbi = [
  {
    type: 'function',
    name: 'exit',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct YoRedeemFuseExitData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          { name: 'shares', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
