import { Abi } from 'viem';

export const aerodromeClaimFeesFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketIdInput",
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
        "internalType": "struct AerodromeClaimFeesFuseEnterData",
        "components": [
          {
            "name": "pools",
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
    "type": "error",
    "name": "AerodromeClaimFeesFuseUnsupportedPool",
    "inputs": [
      {
        "name": "operation",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "pool",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
