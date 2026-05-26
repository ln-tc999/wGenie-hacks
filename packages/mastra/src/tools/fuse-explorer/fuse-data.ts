/**
 * Fuse Explorer Data
 * Contains metadata about all fuse protocols and categories
 */

export interface FuseProtocol {
  id: string;
  name: string;
  description: string;
  category: 'lending' | 'dex' | 'yield' | 'execution' | 'basic' | 'vault';
  fuses: string[];
  hasReadme: boolean;
}

export const FUSE_PROTOCOLS: FuseProtocol[] = [
  // Lending Protocols
  {
    id: 'aave_v2',
    name: 'Aave V2',
    description: 'Aave V2 lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Supply'],
    hasReadme: true,
  },
  {
    id: 'aave_v3',
    name: 'Aave V3',
    description: 'Aave V3 lending protocol with advanced features',
    category: 'lending',
    fuses: ['Balance', 'Borrow', 'Collateral', 'Supply', 'WithPriceOracleMiddlewareBalance'],
    hasReadme: true,
  },
  {
    id: 'compound_v2',
    name: 'Compound V2',
    description: 'Compound V2 lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'compound_v3',
    name: 'Compound V3',
    description: 'Compound V3 (Comet) lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'euler',
    name: 'Euler V2',
    description: 'Euler V2 modular lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Batch', 'Borrow', 'Collateral', 'Controller', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'moonwell',
    name: 'Moonwell',
    description: 'Moonwell lending protocol (Base)',
    category: 'lending',
    fuses: ['Balance', 'Borrow', 'EnableMarket', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'morpho',
    name: 'Morpho Blue',
    description: 'Morpho Blue lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Borrow', 'Collateral', 'FlashLoan', 'OnlyLiquidityBalance', 'Supply', 'SupplyWithCallBackData'],
    hasReadme: false,
  },
  {
    id: 'silo_v2',
    name: 'Silo V2',
    description: 'Silo V2 isolated lending protocol',
    category: 'lending',
    fuses: ['Balance', 'Borrow', 'SupplyBorrowableCollateral', 'SupplyNonBorrowableCollateral'],
    hasReadme: false,
  },
  {
    id: 'spark',
    name: 'Spark Protocol',
    description: 'Spark lending protocol (MakerDAO)',
    category: 'lending',
    fuses: ['Balance', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'liquity',
    name: 'Liquity',
    description: 'Liquity stability pool',
    category: 'lending',
    fuses: ['Balance', 'StabilityPool'],
    hasReadme: true,
  },
  {
    id: 'ebisu',
    name: 'Ebisu',
    description: 'Ebisu CDP protocol',
    category: 'lending',
    fuses: ['AdjustInterestRate', 'AdjustTrove', 'ZapperBalance', 'ZapperCreate', 'ZapperLeverModify'],
    hasReadme: true,
  },

  // DEX & AMM Protocols
  {
    id: 'uniswap',
    name: 'Uniswap',
    description: 'Uniswap V2 and V3 DEX',
    category: 'dex',
    fuses: ['V2Swap', 'V3Collect', 'V3ModifyPosition', 'V3NewPosition', 'V3Swap'],
    hasReadme: false,
  },
  {
    id: 'balancer',
    name: 'Balancer V2',
    description: 'Balancer V2 AMM and liquidity pools',
    category: 'dex',
    fuses: ['Balance', 'Gauge', 'LiquidityProportional', 'LiquidityUnbalanced', 'SingleToken'],
    hasReadme: true,
  },
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    description: 'Aerodrome DEX on Base',
    category: 'dex',
    fuses: ['Balance', 'ClaimFees', 'Gauge', 'Liquidity'],
    hasReadme: false,
  },
  {
    id: 'aerodrome_slipstream',
    name: 'Aerodrome Slipstream',
    description: 'Aerodrome concentrated liquidity AMM',
    category: 'dex',
    fuses: ['Balance', 'CLGauge', 'Collect', 'ModifyPosition', 'NewPosition'],
    hasReadme: false,
  },
  {
    id: 'velodrome_superchain',
    name: 'Velodrome Superchain',
    description: 'Velodrome Superchain DEX',
    category: 'dex',
    fuses: ['Balance', 'Gauge', 'Liquidity'],
    hasReadme: false,
  },
  {
    id: 'velodrome_superchain_slipstream',
    name: 'Velodrome Slipstream',
    description: 'Velodrome concentrated liquidity',
    category: 'dex',
    fuses: ['Balance', 'Collect', 'LeafCLGauge', 'ModifyPosition', 'NewPosition'],
    hasReadme: false,
  },
  {
    id: 'ramses',
    name: 'Ramses V2',
    description: 'Ramses V2 DEX on Arbitrum',
    category: 'dex',
    fuses: ['V2Collect', 'V2ModifyPosition', 'V2NewPosition'],
    hasReadme: false,
  },
  {
    id: 'curve_gauge',
    name: 'Curve Gauges',
    description: 'Curve liquidity gauges',
    category: 'dex',
    fuses: ['ChildLiquidityGaugeBalance', 'ChildLiquidityGaugeErc4626Balance', 'ChildLiquidityGaugeSupply'],
    hasReadme: false,
  },
  {
    id: 'curve_stableswap_ng',
    name: 'Curve Stableswap NG',
    description: 'Curve Stableswap next generation',
    category: 'dex',
    fuses: ['SingleSideBalance', 'SingleSideSupply'],
    hasReadme: false,
  },

  // Yield & Staking
  {
    id: 'stake_dao_v2',
    name: 'Stake DAO V2',
    description: 'Stake DAO yield optimization',
    category: 'yield',
    fuses: ['Balance', 'Supply'],
    hasReadme: true,
  },
  {
    id: 'gearbox_v3',
    name: 'Gearbox V3',
    description: 'Gearbox V3 leveraged yield',
    category: 'yield',
    fuses: ['FarmBalance', 'FarmSupply'],
    hasReadme: false,
  },
  {
    id: 'fluid_instadapp',
    name: 'Fluid/Instadapp',
    description: 'Fluid staking by Instadapp',
    category: 'yield',
    fuses: ['StakingBalance', 'StakingSupply'],
    hasReadme: false,
  },
  {
    id: 'harvest',
    name: 'Harvest Finance',
    description: 'Harvest yield aggregator',
    category: 'yield',
    fuses: ['DoHardWork'],
    hasReadme: false,
  },
  {
    id: 'pendle',
    name: 'Pendle Finance',
    description: 'Pendle yield tokenization',
    category: 'yield',
    fuses: ['RedeemPTAfterMaturity', 'SwapPT'],
    hasReadme: false,
  },
  {
    id: 'tac',
    name: 'TAC Staking',
    description: 'TAC staking protocol',
    category: 'yield',
    fuses: ['StakingBalance', 'StakingDelegate', 'StakingEmergency', 'StakingRedelegate'],
    hasReadme: false,
  },
  {
    id: 'yield_basis',
    name: 'Yield Basis',
    description: 'Yield Basis protocol',
    category: 'yield',
    fuses: ['LtBalance', 'LtSupply'],
    hasReadme: true,
  },

  // Execution & Routing
  {
    id: 'async_action',
    name: 'Async Action',
    description: 'Multi-step async operations',
    category: 'execution',
    fuses: ['AsyncAction', 'AsyncActionBalance'],
    hasReadme: true,
  },
  {
    id: 'enso',
    name: 'Enso Finance',
    description: 'DeFi routing and aggregation',
    category: 'execution',
    fuses: ['Enso', 'EnsoBalance', 'EnsoInitExecutor'],
    hasReadme: true,
  },
  {
    id: 'universal_token_swapper',
    name: 'Universal Token Swapper',
    description: 'Generic token swap routing',
    category: 'execution',
    fuses: ['Swapper', 'SwapperEth', 'SwapperWithVerification'],
    hasReadme: false,
  },

  // Basic Assets
  {
    id: 'erc20',
    name: 'ERC20',
    description: 'ERC20 token balance tracking',
    category: 'basic',
    fuses: ['Balance'],
    hasReadme: false,
  },
  {
    id: 'erc4626',
    name: 'ERC4626',
    description: 'ERC4626 vault integration',
    category: 'basic',
    fuses: ['Balance', 'Supply'],
    hasReadme: false,
  },
  {
    id: 'st_eth_wrapper',
    name: 'stETH Wrapper',
    description: 'Lido stETH wrapping',
    category: 'basic',
    fuses: ['StEthWrapper'],
    hasReadme: false,
  },

  // Plasma Vault Operations
  {
    id: 'plasma_vault',
    name: 'Plasma Vault',
    description: 'Plasma Vault internal operations',
    category: 'vault',
    fuses: ['BalanceAssetsValidation', 'RedeemFromRequest', 'RequestShares'],
    hasReadme: false,
  },
  {
    id: 'burn_request_fee',
    name: 'Burn Request Fee',
    description: 'Fee handling for burn requests',
    category: 'vault',
    fuses: ['BurnRequestFee'],
    hasReadme: false,
  },
  {
    id: 'configure_instant_withdrawal',
    name: 'Instant Withdrawal Config',
    description: 'Instant withdrawal configuration',
    category: 'vault',
    fuses: ['ConfigureInstantWithdrawal'],
    hasReadme: false,
  },
];

export const FUSE_TYPES = [
  { type: 'Balance', description: 'Read-only fuses that track USD value of positions (18 decimals)' },
  { type: 'Supply', description: 'Deposit and withdraw liquidity to/from protocols' },
  { type: 'Borrow', description: 'Borrow and repay assets in lending protocols' },
  { type: 'Collateral', description: 'Manage collateral positions in lending protocols' },
  { type: 'Swap', description: 'Token exchange operations' },
  { type: 'Position', description: 'Create, modify, and collect LP positions' },
  { type: 'Gauge', description: 'Stake in liquidity gauges for rewards' },
  { type: 'Special', description: 'Async operations, flash loans, and other specialized fuses' },
];

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  lending: 'Lending protocols - supply, borrow, and manage collateral',
  dex: 'DEX and AMM protocols - swap tokens and provide liquidity',
  yield: 'Yield optimization and staking protocols',
  execution: 'DeFi routing, aggregation, and multi-step operations',
  basic: 'Basic asset handling - ERC20, ERC4626, wrappers',
  vault: 'Plasma Vault internal operations',
};

/**
 * Get protocols by category
 */
export function getProtocolsByCategory(category: string): FuseProtocol[] {
  return FUSE_PROTOCOLS.filter((p) => p.category === category);
}

/**
 * Find protocol by ID
 */
export function getProtocolById(id: string): FuseProtocol | undefined {
  return FUSE_PROTOCOLS.find((p) => p.id === id || p.id.replace(/_/g, '-') === id);
}

/**
 * Search protocols and fuses by query
 */
export function searchFuses(query: string): { protocol: FuseProtocol; matchingFuses: string[] }[] {
  const lowerQuery = query.toLowerCase();
  const results: { protocol: FuseProtocol; matchingFuses: string[] }[] = [];

  for (const protocol of FUSE_PROTOCOLS) {
    const matchingFuses = protocol.fuses.filter((f) => f.toLowerCase().includes(lowerQuery));

    const protocolMatches =
      protocol.id.toLowerCase().includes(lowerQuery) ||
      protocol.name.toLowerCase().includes(lowerQuery) ||
      protocol.description.toLowerCase().includes(lowerQuery);

    if (protocolMatches || matchingFuses.length > 0) {
      results.push({
        protocol,
        matchingFuses: protocolMatches ? protocol.fuses : matchingFuses,
      });
    }
  }

  return results;
}

/**
 * Get all fuse count
 */
export function getTotalFuseCount(): number {
  return FUSE_PROTOCOLS.reduce((sum, p) => sum + p.fuses.length, 0);
}

/**
 * Convert protocol ID to Solidity naming convention
 * e.g., "aave_v3" -> "AaveV3"
 */
export function toSolidityName(protocolId: string): string {
  return protocolId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Convert to TypeScript ABI naming convention
 * e.g., "aave_v3", "Supply" -> "aave-v3-supply-fuse.abi.ts"
 */
export function toAbiFileName(protocolId: string, fuseName: string): string {
  const protocolPart = protocolId.replace(/_/g, '-');
  const fusePart = fuseName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  return `${protocolPart}-${fusePart}-fuse.abi.ts`;
}
