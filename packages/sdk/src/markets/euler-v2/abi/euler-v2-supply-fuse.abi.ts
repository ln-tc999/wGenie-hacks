import { Abi } from 'viem';

export const eulerV2SupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct EulerV2SupplyFuseEnterData',
        components: [
          { name: 'eulerVault', type: 'address', internalType: 'address' },
          { name: 'maxAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
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
        internalType: 'struct EulerV2SupplyFuseExitData',
        components: [
          { name: 'eulerVault', type: 'address', internalType: 'address' },
          { name: 'maxAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
