import { Abi } from 'viem';

export const ebisuZapperCreateFuseAbi = [
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
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ETH_GAS_COMPENSATION",
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
        "internalType": "struct EbisuZapperCreateFuseEnterData",
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
            "name": "collAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "ebusdAmount",
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
          },
          {
            "name": "flashLoanAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "annualInterestRate",
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
        "internalType": "struct EbisuZapperCreateFuseExitData",
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
            "name": "minExpectedCollateral",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "exitFromCollateral",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "EbisuZapperCreateFuseEnter",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collAmount",
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
      },
      {
        "name": "troveId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EbisuZapperCreateFuseExit",
    "inputs": [
      {
        "name": "zapper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "ownerIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WethEthAdapterCreated",
    "inputs": [
      {
        "name": "adapterAddress",
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
    "name": "DebtBelowMin",
    "inputs": [
      {
        "name": "debt",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "ICRBelowMCR",
    "inputs": [
      {
        "name": "icr",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "mcr",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NewOracleFailureDetected",
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
    "name": "TroveAlreadyOpen",
    "inputs": []
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
  },
  {
    "type": "error",
    "name": "UpfrontFeeTooHigh",
    "inputs": [
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "WethAddressNotValid",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WethEthAdapterNotFound",
    "inputs": []
  }
] as const satisfies Abi;
