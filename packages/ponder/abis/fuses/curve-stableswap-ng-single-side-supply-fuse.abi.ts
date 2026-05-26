import { Abi } from 'viem';

export const curveStableswapNGSingleSideSupplyFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketId_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MARKET_ID",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "enter",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct CurveStableswapNGSingleSideSupplyFuseEnterData",
        "components": [
          {
            "name": "curveStableswapNG",
            "type": "address",
            "internalType": "contract ICurveStableswapNG"
          },
          {
            "name": "asset",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "assetAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minLpTokenAmountReceived",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "exit",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct CurveStableswapNGSingleSideSupplyFuseExitData",
        "components": [
          {
            "name": "curveStableswapNG",
            "type": "address",
            "internalType": "contract ICurveStableswapNG"
          },
          {
            "name": "lpTokenAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "asset",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "minCoinAmountReceived",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "type": "error",
    "name": "AddressEmptyCode",
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AddressInsufficientBalance",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "CurveStableswapNGSingleSideSupplyFuseUnsupportedPool",
    "inputs": [
      {
        "name": "poolAddress",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "CurveStableswapNGSingleSideSupplyFuseUnsupportedPoolAsset",
    "inputs": [
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "FailedInnerCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
