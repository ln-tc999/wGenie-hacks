import { Abi } from 'viem';

export const morphoBorrowFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct MorphoBorrowFuseEnterData',
        components: [
          {
            name: 'morphoMarketId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'amountToBorrow',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'sharesToBorrow',
            type: 'uint256',
            internalType: 'uint256',
          },
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
        internalType: 'struct MorphoBorrowFuseExitData',
        components: [
          {
            name: 'morphoMarketId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'amountToRepay',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'sharesToRepay',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
