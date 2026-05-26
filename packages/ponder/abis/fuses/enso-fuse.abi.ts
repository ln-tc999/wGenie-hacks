import { Abi } from 'viem';

export const ensoFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "weth_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "delegateEnsoShortcuts_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DELEGATE_ENSO_SHORTCUTS",
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
    "name": "WETH",
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
        "internalType": "struct EnsoFuseEnterData",
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
            "name": "wEthAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "accountId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "requestId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "commands",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "state",
            "type": "bytes[]",
            "internalType": "bytes[]"
          },
          {
            "name": "tokensToReturn",
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
        "internalType": "struct EnsoFuseExitData",
        "components": [
          {
            "name": "tokens",
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
    "name": "EnsoFuseInvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoFuseInvalidArrayLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoFuseInvalidExecutorAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoFuseInvalidTokenOut",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoFuseInvalidWethAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoFuseUnsupportedAsset",
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
    "name": "EnsoFuseUnsupportedCommand",
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
