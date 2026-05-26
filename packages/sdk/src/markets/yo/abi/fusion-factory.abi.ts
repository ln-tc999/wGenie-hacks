import { Abi } from 'viem';

export const fusionFactoryAbi = [
  {
    type: 'function',
    name: 'clone',
    inputs: [
      { name: 'assetName_', type: 'string', internalType: 'string' },
      { name: 'assetSymbol_', type: 'string', internalType: 'string' },
      {
        name: 'underlyingToken_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'redemptionDelayInSeconds_',
        type: 'uint256',
        internalType: 'uint256',
      },
      { name: 'owner_', type: 'address', internalType: 'address' },
      { name: 'daoFeePackageIndex_', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct FusionFactoryLogicLib.FusionInstance',
        components: [
          { name: 'index', type: 'uint256', internalType: 'uint256' },
          { name: 'version', type: 'uint256', internalType: 'uint256' },
          { name: 'assetName', type: 'string', internalType: 'string' },
          { name: 'assetSymbol', type: 'string', internalType: 'string' },
          { name: 'assetDecimals', type: 'uint8', internalType: 'uint8' },
          {
            name: 'underlyingToken',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'underlyingTokenSymbol',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'underlyingTokenDecimals',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'initialOwner',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'plasmaVault',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'plasmaVaultBase',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'accessManager',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'feeManager',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'rewardsManager',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'withdrawManager',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'contextManager',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'priceManager',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
