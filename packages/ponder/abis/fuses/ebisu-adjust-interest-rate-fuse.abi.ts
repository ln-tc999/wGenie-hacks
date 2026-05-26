import { Abi } from 'viem';

export const ebisuAdjustInterestRateFuseAbi = [
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
        "internalType": "struct EbisuAdjustInterestRateFuse.EbisuAdjustInterestRateFuseEnterData",
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
            "name": "newAnnualInterestRate",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxUpfrontFee",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "upperHint",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lowerHint",
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
    "name": "EbisuAdjustInterestRateFuseEnter",
    "inputs": [
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newAnnualInterestRate",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
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
