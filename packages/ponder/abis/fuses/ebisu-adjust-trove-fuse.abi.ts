import { Abi } from 'viem';

export const ebisuAdjustTroveFuseAbi = [
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
    "name": "enter",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct EbisuAdjustTroveFuse.EbisuAdjustTroveFuseEnterData",
        "components": [
          {
            "name": "zapper",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "registry",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "collChange",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "debtChange",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "isCollIncrease",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "isDebtIncrease",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "maxUpfrontFee",
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
    "name": "TroveNotOpen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnsupportedSubstrate",
    "inputs": []
  }
] as const satisfies Abi;
