import { type Address, type Hex, type PublicClient, type WalletClient, pad } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { fusionFactoryAbi } from './abi/fusion-factory.abi';
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
} from './yo.addresses';
import { YO_TREASURY_ROLES, YO_VAULT_SLOTS, SWAP_MARKET_ID } from './yo.constants';
import type { ChainId } from '../../fusion.types';

function requireAddress(address: Address | undefined, name: string): Address {
  if (!address) throw new Error(`${name} not configured for this chain`);
  return address;
}

function toSubstrate(address: Address): Hex {
  return pad(address, { size: 32 }).toLowerCase() as Hex;
}

export interface VaultCreationResult {
  vaultAddress: Address;
  accessManagerAddress: Address;
  plasmaVault: PlasmaVault;
  txHash: `0x${string}`;
}

export interface YoTreasuryConfig {
  chainId: ChainId;
  ownerAddress: Address;
  underlyingToken?: Address;
  vaultName?: string;
  vaultSymbol?: string;
  redemptionDelayInSeconds?: bigint;
  daoFeePackageIndex?: bigint;
}

export interface CreateAndConfigureOptions {
  zeroBalanceFuseAddress?: Address;
}

/**
 * Clone a new PlasmaVault via FusionFactory.
 * Defaults to USDC underlying with 1s redemption delay.
 */
export async function cloneVault(
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: YoTreasuryConfig,
): Promise<VaultCreationResult> {
  const chainId = config.chainId;
  const factoryAddress = requireAddress(FUSION_FACTORY_ADDRESS[chainId], 'FUSION_FACTORY_ADDRESS');
  const underlyingToken = config.underlyingToken ?? requireAddress(YO_USDC_ADDRESS[chainId], 'YO_USDC_ADDRESS');
  const vaultName = config.vaultName ?? 'YO Treasury';
  const vaultSymbol = config.vaultSymbol ?? 'yoTREASURY';
  const redemptionDelay = config.redemptionDelayInSeconds ?? 1n;
  const daoFeePackageIndex = config.daoFeePackageIndex ?? 0n;

  const { request, result } = await publicClient.simulateContract({
    account: walletClient.account,
    address: factoryAddress,
    abi: fusionFactoryAbi,
    functionName: 'clone',
    args: [vaultName, vaultSymbol, underlyingToken, redemptionDelay, config.ownerAddress, daoFeePackageIndex],
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const plasmaVault = await PlasmaVault.create(publicClient, result.plasmaVault);

  return {
    vaultAddress: result.plasmaVault,
    accessManagerAddress: result.accessManager,
    plasmaVault,
    txHash,
  };
}

/**
 * Grant all YO Treasury roles (ATOMIST, FUSE_MANAGER, ALPHA, WHITELIST) to the owner.
 */
export async function grantRoles(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  ownerAddress: Address,
): Promise<void> {
  const roles = [
    YO_TREASURY_ROLES.ATOMIST,
    YO_TREASURY_ROLES.FUSE_MANAGER,
    YO_TREASURY_ROLES.ALPHA,
    YO_TREASURY_ROLES.WHITELIST,
  ];

  for (const role of roles) {
    await plasmaVault.grantRole(walletClient, role, ownerAddress, 0);
  }
}

/**
 * Add all ERC4626 supply fuses (4 slots) and the UniversalTokenSwapperFuse.
 * Requires FUSE_MANAGER_ROLE.
 */
export async function addFuses(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  chainId: ChainId,
): Promise<void> {
  const fuseAddresses: Address[] = [
    requireAddress(ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS[chainId], 'ERC4626_SUPPLY_FUSE_SLOT1'),
    requireAddress(ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS[chainId], 'ERC4626_SUPPLY_FUSE_SLOT2'),
    requireAddress(ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS[chainId], 'ERC4626_SUPPLY_FUSE_SLOT3'),
    requireAddress(ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS[chainId], 'ERC4626_SUPPLY_FUSE_SLOT4'),
    requireAddress(YO_REDEEM_FUSE_SLOT1_ADDRESS[chainId], 'YO_REDEEM_FUSE_SLOT1'),
    requireAddress(YO_REDEEM_FUSE_SLOT2_ADDRESS[chainId], 'YO_REDEEM_FUSE_SLOT2'),
    requireAddress(YO_REDEEM_FUSE_SLOT3_ADDRESS[chainId], 'YO_REDEEM_FUSE_SLOT3'),
    requireAddress(YO_REDEEM_FUSE_SLOT4_ADDRESS[chainId], 'YO_REDEEM_FUSE_SLOT4'),
    requireAddress(UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[chainId], 'UNIVERSAL_TOKEN_SWAPPER_FUSE'),
  ];

  await plasmaVault.addFuses(walletClient, fuseAddresses);
}

/**
 * Add balance fuses for each ERC4626 market slot and optionally the ZeroBalanceFuse for the swap market.
 * Requires FUSE_MANAGER_ROLE.
 */
export async function addBalanceFuses(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  chainId: ChainId,
  options?: { zeroBalanceFuseAddress?: Address },
): Promise<void> {
  const balanceFuses = [
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT1_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT1'), marketId: YO_VAULT_SLOTS.yoUSD.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT2_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT2'), marketId: YO_VAULT_SLOTS.yoETH.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT3_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT3'), marketId: YO_VAULT_SLOTS.yoBTC.marketId },
    { fuse: requireAddress(ERC4626_BALANCE_FUSE_SLOT4_ADDRESS[chainId], 'ERC4626_BALANCE_FUSE_SLOT4'), marketId: YO_VAULT_SLOTS.yoEUR.marketId },
  ];

  for (const { fuse, marketId } of balanceFuses) {
    await plasmaVault.addBalanceFuse(walletClient, fuse, marketId);
  }

  // Add ZeroBalanceFuse for swap market if address is provided or configured on-chain
  const zeroBalanceFuse = options?.zeroBalanceFuseAddress ?? ZERO_BALANCE_FUSE_ADDRESS[chainId];
  if (zeroBalanceFuse) {
    await plasmaVault.addBalanceFuse(walletClient, zeroBalanceFuse, SWAP_MARKET_ID);
  }
}

/**
 * Configure market substrates:
 * - 4 ERC4626 markets with one YO vault address each
 * - Swap market with all tokens + swap routers
 * Requires ATOMIST_ROLE.
 */
export async function configureSubstrates(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
  chainId: ChainId,
): Promise<void> {
  const erc4626Markets = [
    { marketId: YO_VAULT_SLOTS.yoUSD.marketId, vault: requireAddress(YO_USD_ADDRESS[chainId], 'YO_USD') },
    { marketId: YO_VAULT_SLOTS.yoETH.marketId, vault: requireAddress(YO_ETH_ADDRESS[chainId], 'YO_ETH') },
    { marketId: YO_VAULT_SLOTS.yoBTC.marketId, vault: requireAddress(YO_BTC_ADDRESS[chainId], 'YO_BTC') },
    { marketId: YO_VAULT_SLOTS.yoEUR.marketId, vault: requireAddress(YO_EUR_ADDRESS[chainId], 'YO_EUR') },
  ];

  for (const { marketId, vault } of erc4626Markets) {
    await plasmaVault.grantMarketSubstrates(walletClient, marketId, [toSubstrate(vault)]);
  }

  const swapSubstrates: Hex[] = [
    requireAddress(YO_USDC_ADDRESS[chainId], 'YO_USDC'),
    requireAddress(YO_WETH_ADDRESS[chainId], 'YO_WETH'),
    requireAddress(YO_CBBTC_ADDRESS[chainId], 'YO_CBBTC'),
    requireAddress(YO_EURC_ADDRESS[chainId], 'YO_EURC'),
    requireAddress(ODOS_ROUTER_ADDRESS[chainId], 'ODOS_ROUTER'),
    requireAddress(KYBER_SWAP_ROUTER_ADDRESS[chainId], 'KYBER_SWAP_ROUTER'),
    requireAddress(UNISWAP_SWAP_ROUTER_02_ADDRESS[chainId], 'UNISWAP_SWAP_ROUTER_02'),
  ].map((addr) => toSubstrate(addr));

  await plasmaVault.grantMarketSubstrates(walletClient, SWAP_MARKET_ID, swapSubstrates);
}

/**
 * Set empty dependency balance graphs for all 4 ERC4626 markets.
 * Requires FUSE_MANAGER_ROLE.
 */
export async function updateDependencyGraphs(
  walletClient: WalletClient,
  plasmaVault: PlasmaVault,
): Promise<void> {
  const marketIds = [
    YO_VAULT_SLOTS.yoUSD.marketId,
    YO_VAULT_SLOTS.yoETH.marketId,
    YO_VAULT_SLOTS.yoBTC.marketId,
    YO_VAULT_SLOTS.yoEUR.marketId,
  ];

  for (const marketId of marketIds) {
    await plasmaVault.updateDependencyBalanceGraph(walletClient, marketId, []);
  }
}

/**
 * Create and fully configure a YO Treasury vault in one call.
 * Executes: clone → grant roles → add fuses → add balance fuses → configure substrates → update dependency graphs.
 */
export async function createAndConfigureVault(
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: YoTreasuryConfig,
  options?: CreateAndConfigureOptions,
): Promise<VaultCreationResult> {
  const result = await cloneVault(publicClient, walletClient, config);
  const { plasmaVault } = result;

  await grantRoles(walletClient, plasmaVault, config.ownerAddress);
  await addFuses(walletClient, plasmaVault, config.chainId);
  await addBalanceFuses(walletClient, plasmaVault, config.chainId, {
    zeroBalanceFuseAddress: options?.zeroBalanceFuseAddress,
  });
  await configureSubstrates(walletClient, plasmaVault, config.chainId);
  await updateDependencyGraphs(walletClient, plasmaVault);

  return result;
}
