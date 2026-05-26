// ABIs
export { fusionFactoryAbi } from './abi/fusion-factory.abi';
export { plasmaVaultFactoryAbi } from './abi/plasma-vault-factory.abi';
export { yoErc4626SupplyFuseAbi } from './abi/erc4626-supply-fuse.abi';
export { swapRouter02Abi } from './abi/swap-router-02.abi';
export { yoUniversalTokenSwapperFuseAbi } from './abi/universal-token-swapper-fuse.abi';
export { yoRedeemFuseAbi } from './abi/yo-redeem-fuse.abi';

// Addresses
export {
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
  SWAP_EXECUTOR_ADDRESS,
  YO_USD_ADDRESS,
  YO_ETH_ADDRESS,
  YO_BTC_ADDRESS,
  YO_EUR_ADDRESS,
  YO_GATEWAY_ADDRESS,
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
  YO_CBBTC_ADDRESS,
  YO_EURC_ADDRESS,
  ODOS_ROUTER_ADDRESS,
  KYBER_SWAP_ROUTER_ADDRESS,
  UNISWAP_SWAP_ROUTER_02_ADDRESS,
  ZERO_BALANCE_FUSE_ADDRESS,
} from './yo.addresses';

// Constants
export { YO_TREASURY_ROLES, YO_VAULT_SLOTS, SWAP_MARKET_ID } from './yo.constants';

// Vault creation
export {
  cloneVault,
  grantRoles,
  addFuses,
  addBalanceFuses,
  configureSubstrates,
  updateDependencyGraphs,
  createAndConfigureVault,
  type VaultCreationResult,
  type YoTreasuryConfig,
  type CreateAndConfigureOptions,
} from './create-vault';
