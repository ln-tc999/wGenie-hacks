import { Abi } from 'viem';

export const morphoSupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct MorphoSupplyFuseEnterData',
        components: [
          {
            name: 'morphoMarketId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
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
        internalType: 'struct MorphoSupplyFuseExitData',
        components: [
          {
            name: 'morphoMarketId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
