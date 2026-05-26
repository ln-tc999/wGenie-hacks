import { Abi } from 'viem';

export const siloV2SupplyNonBorrowableCollateralFuseAbi = [
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
        "internalType": "struct SiloV2SupplyCollateralFuseEnterData",
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
          },
          {
            "name": "minSiloAssetAmount",
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
        "internalType": "struct SiloV2SupplyCollateralFuseExitData",
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
            "name": "siloShares",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minSiloShares",
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
    "name": "SiloV2SupplyCollateralFuseEnter",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collateralType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ISilo.CollateralType"
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
        "name": "siloShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloAssetAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiloV2SupplyCollateralFuseExit",
    "inputs": [
      {
        "name": "version",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "collateralType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ISilo.CollateralType"
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
        "name": "siloShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "siloAssetAmount",
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
    "name": "SiloV2SupplyCollateralFuseInsufficientSiloAssetAmount",
    "inputs": [
      {
        "name": "finalSiloAssetAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SiloV2SupplyCollateralFuseInsufficientSiloShares",
    "inputs": [
      {
        "name": "finalSiloShares",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minSiloShares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SiloV2SupplyCollateralFuseUnsupportedSiloConfig",
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
  },
  {
    "type": "error",
    "name": "WrongValue",
    "inputs": []
  }
] as const satisfies Abi;
