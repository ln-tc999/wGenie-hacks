import { Abi } from 'viem';

export const zapInAllowanceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'erc4626ZapIn_', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'fallback', stateMutability: 'payable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'ERC4626_ZAP_IN',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferApprovedAssets',
    inputs: [
      { name: 'asset_', type: 'address', internalType: 'address' },
      { name: 'amount_', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AssetsTransferred',
    inputs: [
      {
        name: 'from',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'asset',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
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
  { type: 'error', name: 'AmountIsZero', inputs: [] },
  { type: 'error', name: 'AssetIsZero', inputs: [] },
  { type: 'error', name: 'CurrentZapSenderIsZero', inputs: [] },
  { type: 'error', name: 'EthTransfersNotAccepted', inputs: [] },
  { type: 'error', name: 'FailedInnerCall', inputs: [] },
  { type: 'error', name: 'NotERC4626ZapIn', inputs: [] },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
] as const satisfies Abi;
