import { Abi } from 'viem';

export const configureInstantWithdrawalFuseAbi = [
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
        "internalType": "struct ConfigureInstantWithdrawalFuseEnterData",
        "components": [
          {
            "name": "fuses",
            "type": "tuple[]",
            "internalType": "struct InstantWithdrawalFusesParamsStruct[]",
            "components": [
              {
                "name": "fuse",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "params",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ]
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
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "pure"
  },
  {
    "type": "event",
    "name": "InstantWithdrawalFusesConfigured",
    "inputs": [
      {
        "name": "fuses",
        "type": "tuple[]",
        "indexed": false,
        "internalType": "struct InstantWithdrawalFusesParamsStruct[]",
        "components": [
          {
            "name": "fuse",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "params",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ExitNotSupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FuseUnsupported",
    "inputs": [
      {
        "name": "fuse",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
