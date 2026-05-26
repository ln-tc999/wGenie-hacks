import { base } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

// ─── FusionFactory ───

export const FUSION_FACTORY_ADDRESS = createChainAddresses({
  [base.id]: '0x1455717668fA96534f675856347A973fA907e922',
});

// ─── ERC4626SupplyFuse per slot (one per YO vault market) ───

export const ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS = createChainAddresses({
  [base.id]: '0xbe8ab5217F4f251E4A667650fc34a63035C231a8',
});

export const ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS = createChainAddresses({
  [base.id]: '0xed5Ec535e6e6a3051105A8Ea2E8Bd178951A9EAc',
});

export const ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS = createChainAddresses({
  [base.id]: '0xdA0711a0b1B1dD289c4D7C08704Dd1e4cceA80C1',
});

export const ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS = createChainAddresses({
  [base.id]: '0xb187050408857FC2a57be0a5618e39b331425E77',
});

// ─── ERC4626BalanceFuse per slot ───

export const ERC4626_BALANCE_FUSE_SLOT1_ADDRESS = createChainAddresses({
  [base.id]: '0x7F4D9EFdE7EfEBBAFbb506ca3f711764cBc96391',
});

export const ERC4626_BALANCE_FUSE_SLOT2_ADDRESS = createChainAddresses({
  [base.id]: '0x3Dfe25F60191AAee4213080398D2Fdf65EC3CF2F',
});

export const ERC4626_BALANCE_FUSE_SLOT3_ADDRESS = createChainAddresses({
  [base.id]: '0xfEe84b6AF26a481C1819655dAde5f5588416e19f',
});

export const ERC4626_BALANCE_FUSE_SLOT4_ADDRESS = createChainAddresses({
  [base.id]: '0x903c1ABb5A303Cf717196e8d12CE87F46dE56719',
});

// ─── UniversalTokenSwapperFuse ───

export const UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS = createChainAddresses({
  [base.id]: '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
});

// ─── SwapExecutor (immutable in UniversalTokenSwapperFuse bytecode) ───
// The executor receives tokens from the swap router and sweeps them back to the vault.

export const SWAP_EXECUTOR_ADDRESS = createChainAddresses({
  [base.id]: '0x591435c065fce9713c8B112fcBf5Af98b8975cB3',
});

// ─── YO Vault Addresses ───

export const YO_USD_ADDRESS = createChainAddresses({
  [base.id]: '0x0000000f2eb9f69274678c76222b35eec7588a65',
});

export const YO_ETH_ADDRESS = createChainAddresses({
  [base.id]: '0x3a43aec53490cb9fa922847385d82fe25d0e9de7',
});

export const YO_BTC_ADDRESS = createChainAddresses({
  [base.id]: '0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc',
});

export const YO_EUR_ADDRESS = createChainAddresses({
  [base.id]: '0x50c749ae210d3977adc824ae11f3c7fd10c871e9',
});

// ─── YoGateway ───

export const YO_GATEWAY_ADDRESS = createChainAddresses({
  [base.id]: '0xF1EeE0957267b1A474323Ff9CfF7719E964969FA',
});

// ─── Token Addresses ───

export const YO_USDC_ADDRESS = createChainAddresses({
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
});

export const YO_WETH_ADDRESS = createChainAddresses({
  [base.id]: '0x4200000000000000000000000000000000000006',
});

export const YO_CBBTC_ADDRESS = createChainAddresses({
  [base.id]: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
});

export const YO_EURC_ADDRESS = createChainAddresses({
  [base.id]: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
});

// ─── Swap Router Addresses ───

export const ODOS_ROUTER_ADDRESS = createChainAddresses({
  [base.id]: '0x19cEeAd7105607Cd444F5ad10dd51356436095a1',
});

export const KYBER_SWAP_ROUTER_ADDRESS = createChainAddresses({
  [base.id]: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5',
});

// ─── Uniswap V3 SwapRouter02 (for pre-encoded swap calldata) ───

export const UNISWAP_SWAP_ROUTER_02_ADDRESS = createChainAddresses({
  [base.id]: '0x2626664c2603336E57B271c5C0b26F421741e481',
});

// ─── YoRedeemFuse per slot (calls redeem() instead of withdraw()) ───

export const YO_REDEEM_FUSE_SLOT1_ADDRESS = createChainAddresses({
  [base.id]: '0x6f7248f6d057e5f775a2608a71e1b0050b1adb95',
});

export const YO_REDEEM_FUSE_SLOT2_ADDRESS = createChainAddresses({
  [base.id]: '0xaebd1bab51368b0382a3f963468cab3edc524e5d',
});

export const YO_REDEEM_FUSE_SLOT3_ADDRESS = createChainAddresses({
  [base.id]: '0x5760089c08a2b805760f0f86e867bffa9543aa41',
});

export const YO_REDEEM_FUSE_SLOT4_ADDRESS = createChainAddresses({
  [base.id]: '0x7CB5E0e8083392EdEB4AaF68838215A3dD1831e5',
});

// ─── ZeroBalanceFuse for Swap Market ───
// Required for PlasmaVault.execute() to work with UniversalTokenSwapperFuse.
// Without this, _updateMarketsBalances() fails with AddressEmptyCode(address(0)).
export const ZERO_BALANCE_FUSE_ADDRESS = createChainAddresses({
  [base.id]: '0x706ca1cA4EcE9CF23301D6AB35ce6fb7Cf25DA15',
});
