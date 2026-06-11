# WalletGenie Treasury Reference

## Addresses
- **Mantle Sepolia (5003)**: `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4`

## Core Functions

### execute
- **Description**: Allows the manager (AI agent wallet) to execute any call from the treasury.
- **Signature**: `execute(address target, uint256 value, bytes data)`
- **ABI**:
```json
{
  "inputs": [
    { "name": "target", "type": "address" },
    { "name": "value", "type": "uint256" },
    { "name": "data", "type": "bytes" }
  ],
  "name": "execute",
  "outputs": [{ "name": "", "type": "bytes" }],
  "stateMutability": "payable",
  "type": "function"
}
```

### deposit
- **Description**: Public function to deposit native MNT.
- **Signature**: `deposit()` (payable)
