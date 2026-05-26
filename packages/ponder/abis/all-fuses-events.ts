import { Abi } from 'viem';

export const allFusesEventsAbi = [
  {
    "type": "event",
    "name": "AaveV2SupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV2SupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV2SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3BorrowFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "interestRateMode",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3BorrowFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "repaidAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "interestRateMode",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3DisableCollateralFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3EnableCollateralFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3SupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "userEModeCategoryId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3SupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AaveV3SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AerodromeClaimFeesFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "pool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "claimed0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "claimed1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AerodromeGaugeFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AerodromeGaugeFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AerodromeLiquidityFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenA",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenB",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amountA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountB",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AerodromeLiquidityFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenA",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenB",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amountA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountB",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamCLGaugeFuseEnter",
    "inputs": [
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamCLGaugeFuseExit",
    "inputs": [
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamCollectFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamModifyPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamModifyPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamNewPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "token0",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tickSpacing",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickLower",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickUpper",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AreodromeSlipstreamNewPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AsyncActionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountOut",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AsyncActionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BalancerGaugeFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "bptAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BatchExecuted",
    "inputs": [
      {
        "name": "batchSize",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "assets",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "vaults",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BurnRequestFeeEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV2SupplyEnterFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV2SupplyExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV2SupplyExitFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV3SupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV3SupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CompoundV3SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveChildLiquidityGaugeSupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "childLiquidityGauge",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveChildLiquidityGaugeSupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "childLiquidityGauge",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveChildLiquidityGaugeSupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "childLiquidityGauge",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveSupplyStableswapNGSingleSideSupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "curvePool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "assetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveSupplyStableswapNGSingleSideSupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "curvePool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "lpTokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "coinAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurveSupplyStableswapNGSingleSideSupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "curvePool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "lpTokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "minCoinAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuAdjustInterestRateFuseEnter",
    "inputs": [
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newAnnualInterestRate",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuAdjustTroveFuseEnter",
    "inputs": [
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "collChange",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "debtChange",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "isCollIncrease",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "isDebtIncrease",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperCreateFuseEnter",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "flashLoanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ebusdAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperCreateFuseExit",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ownerIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperLeverModifyLeverDown",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "flashLoanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "minBoldAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperLeverModifyLeverUp",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "flashLoanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ebusdAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EnsoExecutorCreated",
    "inputs": [
      {
        "name": "executor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "plasmaVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "delegateEnsoShortcuts",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "weth",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EnsoFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "accountId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "tokensToTransfer",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "amounts",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EnsoFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokens",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Erc4626SupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vaultAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Erc4626SupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vaultAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Erc4626SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vaultAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2BorrowEnterFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "borrowAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2BorrowExitFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "repayAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2DisableCollateralFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2DisableControllerFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2EnableCollateralFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2EnableControllerFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2SupplyEnterFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "supplyAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2SupplyExitFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "withdrawnAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EulerV2SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "eulerVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "subAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FluidInstadappStakingFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stakingPool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stakingToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FluidInstadappStakingFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stakingPool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FluidInstadappStakingFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stakingPool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GearboxV3FarmdFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "farmdToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "dToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GearboxV3FarmdFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "farmdToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GearboxV3FarmdFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "farmdToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HarvestDoHardWorkFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "comptroller",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LiquityStabilityPoolFuseEnter",
    "inputs": [
      {
        "name": "stabilityPool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LiquityStabilityPoolFuseExit",
    "inputs": [
      {
        "name": "stabilityPool",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellBorrowEntered",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellBorrowExited",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellMarketDisabled",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "mToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellMarketDisableFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "mToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellMarketEnabled",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "mTokens",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellMarketEnableFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "mTokens",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellSupplyEnterFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellSupplyExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MoonwellSupplyExitFuse",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoBorrowFuseEvent",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "marketId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "morphoMarket",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "assetsBorrowed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "sharesBorrowed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoBorrowFuseRepay",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "marketId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "morphoMarket",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "assetsRepaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "sharesRepaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoCollateralFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoCollateralFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoFlashLoanFuseEvent",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoSupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoSupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoSupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PendleRedeemPTAfterMaturityFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "netTokenOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PendleSwapPTFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "netPtOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "netSyFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "netSyInterm",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PendleSwapPTFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "netTokenOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "netSyFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "netSyInterm",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PlasmaVaultRedeemFromRequestFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "plasmaVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "sharesAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PlasmaVaultRequestSharesFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "plasmaVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "sharesAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RamsesV2CollectFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RamsesV2ModifyPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RamsesV2ModifyPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RamsesV2NewPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "token0",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "fee",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      },
      {
        "name": "tickLower",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickUpper",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RamsesV2NewPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiloV2BorrowFuseEvent",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "marketId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloConfig",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "silo",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "siloAssetAmountBorrowed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloSharesBorrowed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiloV2BorrowFuseRepay",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "marketId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloConfig",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "silo",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "siloAssetAmountRepaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloSharesRepaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiloV2SupplyCollateralFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collateralType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ISilo.CollateralType"
      },
      {
        "name": "siloConfig",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "silo",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "siloShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiloV2SupplyCollateralFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collateralType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ISilo.CollateralType"
      },
      {
        "name": "siloConfig",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "silo",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "siloShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SparkSupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SparkSupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SparkSupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StakeDaoV2SupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "rewardVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "rewardVaultShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "finalLpTokenUnderlyingAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StakeDaoV2SupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "rewardVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "finalRewardVaultShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenUnderlyingAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StakeDaoV2SupplyFuseExitFailed",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "rewardVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "finalRewardVaultShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lpTokenUnderlyingAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StEthWrapperFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stEthAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "wstEthAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StEthWrapperFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "wstEthAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "stEthAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV2SwapFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenInAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "path",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "minOutAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3CollectFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3ModifyPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3ModifyPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3NewPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "token0",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "fee",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      },
      {
        "name": "tickLower",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickUpper",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3NewPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenIds",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniswapV3SwapFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenInAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "path",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "minOutAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniversalTokenSwapperEthFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenIn",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenInDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tokenOutDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniversalTokenSwapperFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenIn",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenInDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tokenOutDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UniversalTokenSwapperWithVerificationFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenIn",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenInDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tokenOutDelta",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainGaugeFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainGaugeFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainLiquidityFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenA",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenB",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amountA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountB",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainLiquidityFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenA",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenB",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "stable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amountA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountB",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamCollectFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamLeafCLGaugeEnter",
    "inputs": [
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamLeafCLGaugeExit",
    "inputs": [
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamModifyPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamModifyPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamNewPositionFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "liquidity",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "amount0",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "token0",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tickSpacing",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickLower",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "tickUpper",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VelodromeSuperchainSlipstreamNewPositionFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WethEthAdapterCreated",
    "inputs": [
      {
        "name": "adapterAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "plasmaVault",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "weth",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WithdrawManagerUpdated",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "newManager",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "YieldBasisLtSupplyFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltAssetToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "debt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ltSharesAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "YieldBasisLtSupplyFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltSharesAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ltAssetAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "YieldBasisLtSupplyFuseInstantWithdrawExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ltSharesAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ltAssetAmountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "debtChange",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      }
    ],
    "anonymous": false
  }
] as const satisfies Abi;
