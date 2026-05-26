import { Abi } from 'viem';

export const aaveV3PoolAddressesProviderAbi = [
  {
    type: 'function',
    name: 'getPoolDataProvider',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const satisfies Abi;

export const aaveV3PoolDataProviderAbi = [
  {
    type: 'function',
    name: 'getReserveTokensAddresses',
    inputs: [{ name: 'asset', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: 'aTokenAddress',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'stableDebtTokenAddress',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'variableDebtTokenAddress',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
] as const satisfies Abi;
