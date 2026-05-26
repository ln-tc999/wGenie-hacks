import { Abi } from 'viem';

/**
 * All fuse error ABIs for Aave V3, Morpho, and Euler V2 markets.
 * This is used by PlasmaVault.execute() to decode revert errors from fuse contracts.
 */
export const fuseErrorsAbi = [
  // ─── Shared Errors (from Errors.sol library) ────────────────────────
  {
    type: 'error',
    name: 'WrongAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WrongValue',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WrongDecimals',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WrongArrayLength',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WrongCaller',
    inputs: [{ name: 'caller', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'UnsupportedQuoteCurrencyFromOracle',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnsupportedPriceOracleMiddleware',
    inputs: [],
  },

  // ─── Aave V3 Supply Fuse ────────────────────────────────────────────
  {
    type: 'error',
    name: 'AaveV3SupplyFuseUnsupportedAsset',
    inputs: [
      { name: 'action', type: 'string', internalType: 'string' },
      { name: 'asset', type: 'address', internalType: 'address' },
    ],
  },

  // ─── Aave V3 Borrow Fuse ───────────────────────────────────────────
  {
    type: 'error',
    name: 'AaveV3BorrowFuseUnsupportedAsset',
    inputs: [
      { name: 'action', type: 'string', internalType: 'string' },
      { name: 'asset', type: 'address', internalType: 'address' },
    ],
  },

  // ─── Morpho Supply Fuse ─────────────────────────────────────────────
  {
    type: 'error',
    name: 'MorphoSupplyFuseUnsupportedMarket',
    inputs: [
      { name: 'action', type: 'string', internalType: 'string' },
      {
        name: 'morphoMarketId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },

  // ─── Morpho Borrow Fuse ─────────────────────────────────────────────
  {
    type: 'error',
    name: 'MorphoBorrowFuseUnsupportedMarket',
    inputs: [
      { name: 'action', type: 'string', internalType: 'string' },
      {
        name: 'morphoMarketId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },

  // ─── Euler V2 Supply Fuse ───────────────────────────────────────────
  {
    type: 'error',
    name: 'EulerV2SupplyFuseUnsupportedEnterAction',
    inputs: [
      { name: 'vault', type: 'address', internalType: 'address' },
      { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
    ],
  },
  {
    type: 'error',
    name: 'EulerV2SupplyFuseUnsupportedVault',
    inputs: [
      { name: 'vault', type: 'address', internalType: 'address' },
      { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
    ],
  },
  {
    type: 'error',
    name: 'EulerV2SupplyFuseWrongAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EulerV2SupplyFuseWrongValue',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EulerV2SupplyFuseInvalidParams',
    inputs: [],
  },

  // ─── Euler V2 Borrow Fuse ──────────────────────────────────────────
  {
    type: 'error',
    name: 'EulerV2BorrowFuseUnsupportedEnterAction',
    inputs: [
      { name: 'vault', type: 'address', internalType: 'address' },
      { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
    ],
  },

  // ─── Euler V2 Collateral Fuse ──────────────────────────────────────
  {
    type: 'error',
    name: 'EulerV2CollateralFuseUnsupportedEnterAction',
    inputs: [
      { name: 'vault', type: 'address', internalType: 'address' },
      { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
    ],
  },

  // ─── OpenZeppelin shared errors (used by SafeERC20, SafeCast) ──────
  {
    type: 'error',
    name: 'AddressEmptyCode',
    inputs: [{ name: 'target', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'AddressInsufficientBalance',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' },
    ],
  },
  {
    type: 'error',
    name: 'FailedInnerCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeCastOverflowedUintDowncast',
    inputs: [
      { name: 'bits', type: 'uint8', internalType: 'uint8' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
] as const satisfies Abi;
