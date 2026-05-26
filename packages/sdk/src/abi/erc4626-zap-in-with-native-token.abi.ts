import { Abi } from 'viem';

const baseAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    name: 'ZAP_IN_ALLOWANCE_CONTRACT',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentZapSender',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referralContractAddress',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setReferralContractAddress',
    inputs: [
      {
        name: 'referralContractAddress_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AddressEmptyCode',
    inputs: [{ name: 'target', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'AddressInsufficientBalance',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
  { type: 'error', name: 'ERC4626VaultIsZero', inputs: [] },
  { type: 'error', name: 'FailedInnerCall', inputs: [] },
  { type: 'error', name: 'InsufficientDepositAssetBalance', inputs: [] },
  { type: 'error', name: 'MinAmountToDepositIsZero', inputs: [] },
  { type: 'error', name: 'NoCalls', inputs: [] },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
  { type: 'error', name: 'ReceiverIsZero', inputs: [] },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
  { type: 'error', name: 'ReferralContractAddressIsZero', inputs: [] },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
] as const satisfies Abi;

export const erc4626ZapInWithNativeTokenAbi = [
  ...baseAbi,
  {
    type: 'function',
    name: 'zapIn',
    inputs: [
      {
        name: 'zapInData_',
        type: 'tuple',
        internalType: 'struct ZapInData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          { name: 'receiver', type: 'address', internalType: 'address' },
          {
            name: 'minAmountToDeposit',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'assetsToRefundToSender',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'calls',
            type: 'tuple[]',
            internalType: 'struct Call[]',
            components: [
              { name: 'target', type: 'address', internalType: 'address' },
              { name: 'data', type: 'bytes', internalType: 'bytes' },
              {
                name: 'nativeTokenAmount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: 'results', type: 'bytes[]', internalType: 'bytes[]' }],
    stateMutability: 'payable',
  },
] as const satisfies Abi;

export const erc4626ZapInWithNativeTokenAndReferralCodeAbi = [
  ...baseAbi,
  {
    type: 'function',
    name: 'zapIn',
    inputs: [
      {
        name: 'zapInData_',
        type: 'tuple',
        internalType: 'struct ZapInData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          { name: 'receiver', type: 'address', internalType: 'address' },
          {
            name: 'minAmountToDeposit',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'assetsToRefundToSender',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'calls',
            type: 'tuple[]',
            internalType: 'struct Call[]',
            components: [
              { name: 'target', type: 'address', internalType: 'address' },
              { name: 'data', type: 'bytes', internalType: 'bytes' },
              {
                name: 'nativeTokenAmount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
      { name: 'referralCode_', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]', internalType: 'bytes[]' }],
    stateMutability: 'payable',
  },
] as const satisfies Abi;
