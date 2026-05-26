import { Abi } from 'viem';

export const aaveV3BorrowFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct AaveV3BorrowFuseEnterData',
        components: [
          { name: 'asset', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct AaveV3BorrowFuseExitData',
        components: [
          { name: 'asset', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
