# Merchant Moe Reference

## Addresses (Mantle Mainnet 5000)
- **LBRouter**: `0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a`

## Common Functions

### swapExactTokensForTokens
- **Signature**: `swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (uint256[] pairBinSteps, uint8[] versions, address[] tokenPath) path, address to, uint256 deadline)`
- **ABI Snippet**:
```json
{
  "name": "swapExactTokensForTokens",
  "inputs": [
    { "name": "amountIn", "type": "uint256" },
    { "name": "amountOutMin", "type": "uint256" },
    {
      "name": "path",
      "type": "tuple",
      "components": [
        { "name": "pairBinSteps", "type": "uint256[]" },
        { "name": "versions", "type": "uint8[]" },
        { "name": "tokenPath", "type": "address[]" }
      ]
    },
    { "name": "to", "type": "address" },
    { "name": "deadline", "type": "uint256" }
  ],
  "outputs": [{ "name": "amountOut", "type": "uint256" }],
  "stateMutability": "nonpayable",
  "type": "function"
}
```

### swapExactNATIVEForTokens
- **Signature**: `swapExactNATIVEForTokens(uint256 amountOutMin, (uint256[] pairBinSteps, uint8[] versions, address[] tokenPath) path, address to, uint256 deadline)`
- **Value**: Must send `amountIn` as msg.value.
