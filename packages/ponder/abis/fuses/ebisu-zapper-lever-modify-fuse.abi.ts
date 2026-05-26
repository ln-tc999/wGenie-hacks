import { Abi } from 'viem';

export const ebisuZapperLeverModifyFuseAbi = [
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
        "internalType": "struct EbisuZapperLeverModifyFuseEnterData",
        "components": [
          {
            "name": "zapper",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "flashLoanAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "ebusdAmount",
            "type": "uint256",
            "internalType": "uint256"
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
    "type": "function",
    "name": "exit",
    "inputs": [
      {
        "name": "data_",
        "type": "tuple",
        "internalType": "struct EbisuZapperLeverModifyFuseExitData",
        "components": [
          {
            "name": "zapper",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "flashLoanAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minBoldAmount",
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
    "name": "EbisuZapperLeverModifyLeverDown",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "flashLoanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "minBoldAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperLeverModifyLeverUp",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "flashLoanAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ebusdAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "UnsupportedSubstrate",
    "inputs": []
  }
] as const satisfies Abi;
