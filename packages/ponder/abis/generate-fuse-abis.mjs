import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const OUT_DIR = path.join(ROOT_DIR, 'external/wgenie-fusion/out');
const TARGET_DIR = path.join(__dirname, 'fuses');

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Function to convert PascalCase to camelCase
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Function to convert PascalCase to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

// List of fuse contracts
const fuseContracts = [
  'AaveV2BalanceFuse',
  'AaveV2SupplyFuse',
  'AaveV3BalanceFuse',
  'AaveV3BorrowFuse',
  'AaveV3CollateralFuse',
  'AaveV3SupplyFuse',
  'AaveV3WithPriceOracleMiddlewareBalanceFuse',
  'AerodromeBalanceFuse',
  'AerodromeClaimFeesFuse',
  'AerodromeGaugeFuse',
  'AerodromeLiquidityFuse',
  'AreodromeSlipstreamBalanceFuse',
  'AreodromeSlipstreamCLGaugeFuse',
  'AreodromeSlipstreamCollectFuse',
  'AreodromeSlipstreamModifyPositionFuse',
  'AreodromeSlipstreamNewPositionFuse',
  'AsyncActionBalanceFuse',
  'AsyncActionFuse',
  'BalancerBalanceFuse',
  'BalancerGaugeFuse',
  'BalancerLiquidityProportionalFuse',
  'BalancerLiquidityUnbalancedFuse',
  'BalancerSingleTokenFuse',
  'BurnRequestFeeFuse',
  'CompoundV2BalanceFuse',
  'CompoundV2SupplyFuse',
  'CompoundV3BalanceFuse',
  'CompoundV3SupplyFuse',
  'ConfigureInstantWithdrawalFuse',
  'CurveChildLiquidityGaugeBalanceFuse',
  'CurveChildLiquidityGaugeErc4626BalanceFuse',
  'CurveChildLiquidityGaugeSupplyFuse',
  'CurveStableswapNGSingleSideBalanceFuse',
  'CurveStableswapNGSingleSideSupplyFuse',
  'EbisuAdjustInterestRateFuse',
  'EbisuAdjustTroveFuse',
  'EbisuZapperBalanceFuse',
  'EbisuZapperCreateFuse',
  'EbisuZapperLeverModifyFuse',
  'EnsoBalanceFuse',
  'EnsoFuse',
  'EnsoInitExecutorFuse',
  'Erc20BalanceFuse',
  'Erc4626BalanceFuse',
  'Erc4626SupplyFuse',
  'EulerV2BalanceFuse',
  'EulerV2BatchFuse',
  'EulerV2BorrowFuse',
  'EulerV2CollateralFuse',
  'EulerV2ControllerFuse',
  'EulerV2SupplyFuse',
  'FluidInstadappStakingBalanceFuse',
  'FluidInstadappStakingSupplyFuse',
  'GearboxV3FarmBalanceFuse',
  'GearboxV3FarmSupplyFuse',
  'HarvestDoHardWorkFuse',
  'LiquityBalanceFuse',
  'LiquityStabilityPoolFuse',
  'MoonwellBalanceFuse',
  'MoonwellBorrowFuse',
  'MoonwellEnableMarketFuse',
  'MoonwellSupplyFuse',
  'MorphoBalanceFuse',
  'MorphoBorrowFuse',
  'MorphoCollateralFuse',
  'MorphoFlashLoanFuse',
  'MorphoOnlyLiquidityBalanceFuse',
  'MorphoSupplyFuse',
  'MorphoSupplyWithCallBackDataFuse',
  'PendleRedeemPTAfterMaturityFuse',
  'PendleSwapPTFuse',
  'PlasmaVaultBalanceAssetsValidationFuse',
  'PlasmaVaultRedeemFromRequestFuse',
  'PlasmaVaultRequestSharesFuse',
  'RamsesV2CollectFuse',
  'RamsesV2ModifyPositionFuse',
  'RamsesV2NewPositionFuse',
  'SiloV2BalanceFuse',
  'SiloV2BorrowFuse',
  'SiloV2SupplyBorrowableCollateralFuse',
  'SiloV2SupplyNonBorrowableCollateralFuse',
  'SparkBalanceFuse',
  'SparkSupplyFuse',
  'StakeDaoV2BalanceFuse',
  'StakeDaoV2SupplyFuse',
  'StEthWrapperFuse',
  'TacStakingBalanceFuse',
  'TacStakingDelegateFuse',
  'TacStakingEmergencyFuse',
  'TacStakingRedelegateFuse',
  'UniswapV2SwapFuse',
  'UniswapV3CollectFuse',
  'UniswapV3ModifyPositionFuse',
  'UniswapV3NewPositionFuse',
  'UniswapV3SwapFuse',
  'UniversalTokenSwapperEthFuse',
  'UniversalTokenSwapperFuse',
  'UniversalTokenSwapperWithVerificationFuse',
  'UpdateWithdrawManagerMaintenanceFuse',
  'VelodromeSuperchainBalanceFuse',
  'VelodromeSuperchainGaugeFuse',
  'VelodromeSuperchainLiquidityFuse',
  'VelodromeSuperchainSlipstreamBalanceFuse',
  'VelodromeSuperchainSlipstreamCollectFuse',
  'VelodromeSuperchainSlipstreamLeafCLGaugeFuse',
  'VelodromeSuperchainSlipstreamModifyPositionFuse',
  'VelodromeSuperchainSlipstreamNewPositionFuse',
  'YieldBasisLtBalanceFuse',
  'YieldBasisLtSupplyFuse',
  'ZeroBalanceFuse'
];

let successCount = 0;
let failCount = 0;
const errors = [];

for (const contractName of fuseContracts) {
  const jsonPath = path.join(OUT_DIR, `${contractName}.sol`, `${contractName}.json`);

  if (!fs.existsSync(jsonPath)) {
    errors.push(`Missing: ${jsonPath}`);
    failCount++;
    continue;
  }

  try {
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const abi = jsonContent.abi;

    if (!abi) {
      errors.push(`No ABI in: ${jsonPath}`);
      failCount++;
      continue;
    }

    const camelCaseName = toCamelCase(contractName) + 'Abi';
    const kebabCaseName = toKebabCase(contractName);
    const fileName = `${kebabCaseName}.abi.ts`;

    const tsContent = `import { Abi } from 'viem';

export const ${camelCaseName} = ${JSON.stringify(abi, null, 2)} as const satisfies Abi;
`;

    fs.writeFileSync(path.join(TARGET_DIR, fileName), tsContent);
    successCount++;
  } catch (err) {
    errors.push(`Error processing ${contractName}: ${err.message}`);
    failCount++;
  }
}

console.log(`Successfully created ${successCount} ABI files`);
if (failCount > 0) {
  console.log(`Failed: ${failCount}`);
  errors.forEach(e => console.log(`  - ${e}`));
}
