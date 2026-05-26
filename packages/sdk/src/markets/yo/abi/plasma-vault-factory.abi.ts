import { Abi } from 'viem';

export const plasmaVaultFactoryAbi = [
  {
    type: 'event',
    name: 'PlasmaVaultCreated',
    inputs: [
      {
        name: 'index',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'plasmaVault',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'assetName',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'assetSymbol',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'underlyingToken',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
] as const satisfies Abi;
