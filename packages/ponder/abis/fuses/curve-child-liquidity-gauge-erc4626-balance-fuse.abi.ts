import { Abi } from 'viem';

export const curveChildLiquidityGaugeErc4626BalanceFuseAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "marketIdInput_",
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
    "name": "balanceOf",
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
    "type": "error",
    "name": "AssetNotFoundInCurvePool",
    "inputs": [
      {
        "name": "curvePool",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const satisfies Abi;
