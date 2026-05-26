import { Abi } from 'viem';

export const eulerV2BatchFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "eulerV2EVC_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "EVC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IEVC"
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
    "name": "enter",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct EulerV2BatchFuseData",
        "components": [
          {
            "name": "batchItems",
            "type": "tuple[]",
            "internalType": "struct EulerV2BatchItem[]",
            "components": [
              {
                "name": "targetContract",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "onBehalfOfAccount",
                "type": "bytes1",
                "internalType": "bytes1"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "assetsForApprovals",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "eulerVaultsForApprovals",
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
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "ArrayLengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DuplicateAsset",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVCInvalidCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVCInvalidSelector",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyBatchItems",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EulerVaultInvalidPermissions",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FailedInnerCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidBatchItem",
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
    "name": "UnsupportedOperation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const satisfies Abi;
