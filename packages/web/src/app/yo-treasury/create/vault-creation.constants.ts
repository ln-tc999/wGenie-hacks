import { type Address, type Hex, pad } from 'viem';
import { base } from 'viem/chains';
import {
  FUSION_FACTORY_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT1_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT2_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT3_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT4_ADDRESS,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
  YO_REDEEM_FUSE_SLOT1_ADDRESS,
  YO_REDEEM_FUSE_SLOT2_ADDRESS,
  YO_REDEEM_FUSE_SLOT3_ADDRESS,
  YO_REDEEM_FUSE_SLOT4_ADDRESS,
  ZERO_BALANCE_FUSE_ADDRESS,
  YO_USD_ADDRESS,
  YO_ETH_ADDRESS,
  YO_BTC_ADDRESS,
  YO_EUR_ADDRESS,
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
  YO_CBBTC_ADDRESS,
  YO_EURC_ADDRESS,
  ODOS_ROUTER_ADDRESS,
  KYBER_SWAP_ROUTER_ADDRESS,
  UNISWAP_SWAP_ROUTER_02_ADDRESS,
  YO_TREASURY_ROLES,
  YO_VAULT_SLOTS,
  SWAP_MARKET_ID,
} from '@wgenie/fusion-sdk';

export const CHAIN_ID = base.id;

function addr(map: Record<number, Address | undefined>): Address {
  const a = map[CHAIN_ID];
  if (!a) throw new Error(`Address not configured for chain ${CHAIN_ID}`);
  return a;
}

function toSubstrate(address: Address): Hex {
  return pad(address, { size: 32 }).toLowerCase() as Hex;
}

// ─── Factory ───
export const FACTORY_ADDRESS = addr(FUSION_FACTORY_ADDRESS);
export const UNDERLYING_TOKEN = addr(YO_USDC_ADDRESS);

// ─── Roles ───
export const ROLES_TO_GRANT = [
  { label: 'Atomist', value: YO_TREASURY_ROLES.ATOMIST },
  { label: 'Fuse Manager', value: YO_TREASURY_ROLES.FUSE_MANAGER },
  { label: 'Alpha', value: YO_TREASURY_ROLES.ALPHA },
  { label: 'Whitelist', value: YO_TREASURY_ROLES.WHITELIST },
] as const;

// ─── Fuses (9 total: 4 supply + 4 redeem + 1 swap) ───
export const ALL_FUSE_ADDRESSES: Address[] = [
  addr(ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS),
  addr(ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS),
  addr(ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS),
  addr(ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS),
  addr(YO_REDEEM_FUSE_SLOT1_ADDRESS),
  addr(YO_REDEEM_FUSE_SLOT2_ADDRESS),
  addr(YO_REDEEM_FUSE_SLOT3_ADDRESS),
  addr(YO_REDEEM_FUSE_SLOT4_ADDRESS),
  addr(UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS),
];

// ─── Balance Fuses (4 ERC4626 + 1 ZeroBalance for swap) ───
export const BALANCE_FUSES = [
  { marketId: YO_VAULT_SLOTS.yoUSD.marketId, fuse: addr(ERC4626_BALANCE_FUSE_SLOT1_ADDRESS), label: 'yoUSD' },
  { marketId: YO_VAULT_SLOTS.yoETH.marketId, fuse: addr(ERC4626_BALANCE_FUSE_SLOT2_ADDRESS), label: 'yoETH' },
  { marketId: YO_VAULT_SLOTS.yoBTC.marketId, fuse: addr(ERC4626_BALANCE_FUSE_SLOT3_ADDRESS), label: 'yoBTC' },
  { marketId: YO_VAULT_SLOTS.yoEUR.marketId, fuse: addr(ERC4626_BALANCE_FUSE_SLOT4_ADDRESS), label: 'yoEUR' },
  { marketId: SWAP_MARKET_ID, fuse: addr(ZERO_BALANCE_FUSE_ADDRESS), label: 'Swap' },
] as const;

// ─── Substrates ───
export const ERC4626_SUBSTRATES = [
  { marketId: YO_VAULT_SLOTS.yoUSD.marketId, substrates: [toSubstrate(addr(YO_USD_ADDRESS))], label: 'yoUSD' },
  { marketId: YO_VAULT_SLOTS.yoETH.marketId, substrates: [toSubstrate(addr(YO_ETH_ADDRESS))], label: 'yoETH' },
  { marketId: YO_VAULT_SLOTS.yoBTC.marketId, substrates: [toSubstrate(addr(YO_BTC_ADDRESS))], label: 'yoBTC' },
  { marketId: YO_VAULT_SLOTS.yoEUR.marketId, substrates: [toSubstrate(addr(YO_EUR_ADDRESS))], label: 'yoEUR' },
] as const;

export const SWAP_SUBSTRATES: Hex[] = [
  addr(YO_USDC_ADDRESS),
  addr(YO_WETH_ADDRESS),
  addr(YO_CBBTC_ADDRESS),
  addr(YO_EURC_ADDRESS),
  addr(ODOS_ROUTER_ADDRESS),
  addr(KYBER_SWAP_ROUTER_ADDRESS),
  addr(UNISWAP_SWAP_ROUTER_02_ADDRESS),
].map((a) => toSubstrate(a));

// ─── Dependency graph market IDs ───
export const DEPENDENCY_MARKET_IDS = [
  YO_VAULT_SLOTS.yoUSD.marketId,
  YO_VAULT_SLOTS.yoETH.marketId,
  YO_VAULT_SLOTS.yoBTC.marketId,
  YO_VAULT_SLOTS.yoEUR.marketId,
] as const;

// ─── Minimal ABI fragments ───

export const fusionFactoryCloneAbi = [
  {
    type: 'function' as const,
    name: 'clone' as const,
    inputs: [
      { name: 'assetName_', type: 'string' as const },
      { name: 'assetSymbol_', type: 'string' as const },
      { name: 'underlyingToken_', type: 'address' as const },
      { name: 'redemptionDelayInSeconds_', type: 'uint256' as const },
      { name: 'owner_', type: 'address' as const },
      { name: 'daoFeePackageIndex_', type: 'uint256' as const },
    ],
    outputs: [
      {
        name: '', type: 'tuple' as const,
        components: [
          { name: 'index', type: 'uint256' as const },
          { name: 'version', type: 'uint256' as const },
          { name: 'assetName', type: 'string' as const },
          { name: 'assetSymbol', type: 'string' as const },
          { name: 'assetDecimals', type: 'uint8' as const },
          { name: 'underlyingToken', type: 'address' as const },
          { name: 'underlyingTokenSymbol', type: 'string' as const },
          { name: 'underlyingTokenDecimals', type: 'uint8' as const },
          { name: 'initialOwner', type: 'address' as const },
          { name: 'plasmaVault', type: 'address' as const },
          { name: 'plasmaVaultBase', type: 'address' as const },
          { name: 'accessManager', type: 'address' as const },
          { name: 'feeManager', type: 'address' as const },
          { name: 'rewardsManager', type: 'address' as const },
          { name: 'withdrawManager', type: 'address' as const },
          { name: 'contextManager', type: 'address' as const },
          { name: 'priceManager', type: 'address' as const },
        ],
      },
    ],
    stateMutability: 'nonpayable' as const,
  },
] as const;

export const accessManagerAbi = [
  {
    type: 'function' as const,
    name: 'grantRole' as const,
    inputs: [
      { name: 'roleId_', type: 'uint64' as const },
      { name: 'account_', type: 'address' as const },
      { name: 'executionDelay_', type: 'uint32' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'hasRole' as const,
    inputs: [
      { name: 'roleId', type: 'uint64' as const },
      { name: 'account', type: 'address' as const },
    ],
    outputs: [
      { name: 'isMember', type: 'bool' as const },
      { name: 'executionDelay', type: 'uint32' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

export const plasmaVaultAbi = [
  {
    type: 'function' as const,
    name: 'getAccessManagerAddress' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getFuses' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address[]' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'addFuses' as const,
    inputs: [{ name: 'fuses_', type: 'address[]' as const }],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'addBalanceFuse' as const,
    inputs: [
      { name: 'marketId_', type: 'uint256' as const },
      { name: 'fuse_', type: 'address' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'grantMarketSubstrates' as const,
    inputs: [
      { name: 'marketId_', type: 'uint256' as const },
      { name: 'substrates_', type: 'bytes32[]' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getMarketSubstrates' as const,
    inputs: [{ name: 'marketId_', type: 'uint256' as const }],
    outputs: [{ name: '', type: 'bytes32[]' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'updateDependencyBalanceGraphs' as const,
    inputs: [
      { name: 'marketIds_', type: 'uint256[]' as const },
      { name: 'dependencies_', type: 'uint256[][]' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

export { SWAP_MARKET_ID };
