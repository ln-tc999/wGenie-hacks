import { Abi } from 'viem';

export const siloV2BorrowFuseAbi = [
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
        "internalType": "struct SiloV2BorrowFuseEnterData",
        "components": [
          {
            "name": "siloConfig",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "siloIndex",
            "type": "uint8",
            "internalType": "enum SiloIndex"
          },
          {
            "name": "siloAssetAmount",
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
        "internalType": "struct SiloV2BorrowFuseExitData",
        "components": [
          {
            "name": "siloConfig",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "siloIndex",
            "type": "uint8",
            "internalType": "enum SiloIndex"
          },
          {
            "name": "siloAssetAmount",
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
  },
  {
    "type": "error",
    "name": "SiloV2BorrowFuseUnsupportedSiloConfig",
    "inputs": [
      {
        "name": "action",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "siloConfig",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
