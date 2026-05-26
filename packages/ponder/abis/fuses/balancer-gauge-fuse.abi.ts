import { Abi } from 'viem';

export const balancerGaugeFuseAbi = [
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
        "internalType": "struct BalancerGaugeFuseEnterData",
        "components": [
          {
            "name": "gaugeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "bptAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minBptAmount",
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
        "internalType": "struct BalancerGaugeFuseExitData",
        "components": [
          {
            "name": "gaugeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "bptAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minBptAmount",
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
    "name": "BalancerGaugeFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "bptAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BalancerGaugeFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "gaugeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "bptAmount",
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
    "name": "BalancerGaugeFuseInsufficientBptAmount",
    "inputs": [
      {
        "name": "gaugeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "bptAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minBptAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BalancerGaugeFuseUnsupportedGauge",
    "inputs": [
      {
        "name": "gaugeAddress",
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
  }
] as const satisfies Abi;
