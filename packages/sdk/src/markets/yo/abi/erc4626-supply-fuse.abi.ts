import { Abi } from 'viem';

export const yoErc4626SupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct Erc4626SupplyFuseEnterData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          {
            name: 'vaultAssetAmount',
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
        internalType: 'struct Erc4626SupplyFuseExitData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          {
            name: 'vaultAssetAmount',
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
