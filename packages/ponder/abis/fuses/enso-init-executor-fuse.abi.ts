import { Abi } from 'viem';

export const ensoInitExecutorFuseAbi = [
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
    "inputs": [],
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
    "type": "error",
    "name": "EnsoInitExecutorInvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnsoInitExecutorInvalidWethAddress",
    "inputs": []
  }
] as const satisfies Abi;
