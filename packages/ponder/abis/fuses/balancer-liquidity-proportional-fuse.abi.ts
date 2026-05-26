import { Abi } from 'viem';

export const balancerLiquidityProportionalFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "balancerRouter_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "permit2_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BALANCER_ROUTER",
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
    "name": "PERMIT2",
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
        "internalType": "struct BalancerLiquidityProportionalFuseEnterData",
        "components": [
          {
            "name": "pool",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokens",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "maxAmountsIn",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "exactBptAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "exit",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct BalancerLiquidityProportionalFuseExitData",
        "components": [
          {
            "name": "pool",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "exactBptAmountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountsOut",
            "type": "uint256[]",
            "internalType": "uint256[]"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "event",
    "name": "BalancerLiquidityProportionalFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pool",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountsIn",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "exactBptAmountOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BalancerLiquidityProportionalFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pool",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountsOut",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      },
      {
        "name": "exactBptAmountIn",
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
    "name": "BalancerLiquidityProportionalFuseInvalidParams",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BalancerLiquidityProportionalFuseUnsupportedPool",
    "inputs": [
      {
        "name": "pool",
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
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
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
  },
  {
    "type": "error",
    "name": "TokensNotInPool",
    "inputs": [
      {
        "name": "pool",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
