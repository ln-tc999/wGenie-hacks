import { Abi } from 'viem';

export const asyncActionFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "wEth_",
        "type": "address",
        "internalType": "address"
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
    "name": "W_ETH",
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
        "internalType": "struct AsyncActionFuseEnterData",
        "components": [
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "targets",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "callDatas",
            "type": "bytes[]",
            "internalType": "bytes[]"
          },
          {
            "name": "ethAmounts",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "tokensDustToCheck",
            "type": "address[]",
            "internalType": "address[]"
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
        "internalType": "struct AsyncActionFuseExitData",
        "components": [
          {
            "name": "assets",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "fetchCallDatas",
            "type": "bytes[]",
            "internalType": "bytes[]"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "AsyncActionFuseBalanceNotZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseCallDataTooShort",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AsyncActionFuseInvalidArrayLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseInvalidExecutorAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseInvalidMarketId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseInvalidTokenOut",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseInvalidWethAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFusePriceOracleNotConfigured",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AsyncActionFuseTargetNotAllowed",
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "selector",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ]
  },
  {
    "type": "error",
    "name": "AsyncActionFuseTokenOutNotAllowed",
    "inputs": [
      {
        "name": "tokenOut",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "requestedAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxAllowed",
        "type": "uint256",
        "internalType": "uint256"
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
