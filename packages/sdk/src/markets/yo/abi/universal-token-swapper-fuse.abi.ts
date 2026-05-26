import { Abi } from 'viem';

export const yoUniversalTokenSwapperFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct UniversalTokenSwapperEnterData',
        components: [
          { name: 'tokenIn', type: 'address', internalType: 'address' },
          { name: 'tokenOut', type: 'address', internalType: 'address' },
          { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
          {
            name: 'data',
            type: 'tuple',
            internalType: 'struct UniversalTokenSwapperData',
            components: [
              { name: 'targets', type: 'address[]', internalType: 'address[]' },
              { name: 'data', type: 'bytes[]', internalType: 'bytes[]' },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
