import { Abi } from 'viem';

export const balancerLiquidityUnbalancedFuseAbi = [
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
        "internalType": "struct BalancerLiquidityUnbalancedFuseEnterData",
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
            "name": "exactAmountsIn",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "minBptAmountOut",
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
        "internalType": "struct BalancerLiquidityUnbalancedFuseExitData",
        "components": [
          {
            "name": "pool",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "maxBptAmountIn",
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
    "name": "BalancerLiquidityUnbalancedFuseEnter",
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
        "name": "bptAmountOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountsIn",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BalancerLiquidityUnbalancedFuseExit",
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
        "name": "bptAmountIn",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountsOut",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
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
    "name": "BalancerLiquidityUnbalancedFuseInvalidParams",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BalancerLiquidityUnbalancedFuseUnsupportedPool",
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
