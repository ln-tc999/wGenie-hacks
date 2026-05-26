# YO Protocol — Gateway Integration Guide

## Why Use YoGateway?

YoGateway is the **recommended integration point** for all deposits and redemptions:

1. **Single entry point** for all current and future YO vaults
2. **Built-in slippage protection** (`minSharesOut` / `minAssetsOut`)
3. **Partner attribution** via `partnerId` (tracked in events for revenue sharing)
4. **Vault validation** via YoRegistry — only allow-listed vaults accepted
5. **Future-proof** — new vaults are automatically accessible once registered

```mermaid
flowchart LR
    subgraph Integrators
        W[Wallet App]
        D[DeFi Protocol]
        A[AI Agent]
    end

    subgraph "YoGateway"
        DEP[deposit'vault, assets,<br/>minShares, receiver, partnerId']
        RED[redeem'vault, shares,<br/>minAssets, receiver, partnerId']
        Q1[quotePreviewDeposit]
        Q2[quotePreviewRedeem]
        Q3[quoteConvertToShares]
        Q4[quoteConvertToAssets]
    end

    subgraph "YoRegistry"
        IS[isYoVault'address' → bool]
        LIST[listYoVaults' ' → address'']
    end

    subgraph Vaults
        V1[yoUSD]
        V2[yoETH]
        V3[yoBTC]
        V4[yoEUR]
    end

    W --> DEP
    W --> RED
    D --> DEP
    D --> RED
    A --> DEP
    A --> RED

    DEP --> IS
    RED --> IS
    Q1 --> IS
    Q2 --> IS

    DEP --> V1
    DEP --> V2
    DEP --> V3
    DEP --> V4
    RED --> V1
    RED --> V2
    RED --> V3
    RED --> V4
```

## Gateway API

### Deposit

```solidity
function deposit(
    address yoVault,        // target vault (must be in registry)
    uint256 assets,         // amount of underlying to deposit
    uint256 minSharesOut,   // minimum shares expected (slippage guard)
    address receiver,       // who receives the yoTokens
    uint32 partnerId        // attribution ID (0 if unregistered)
) external returns (uint256 sharesOut)
```

**Preconditions:**
- User must `approve(gateway, assets)` on the underlying token
- `assets > 0`, `receiver != address(0)`
- Vault must be registered in YoRegistry

**Errors:**
- `Gateway__ZeroAmount` — assets is 0
- `Gateway__ZeroReceiver` — receiver is zero address
- `Gateway__VaultNotAllowed` — vault not in registry
- `Gateway__InsufficientSharesOut(actual, min)` — slippage exceeded

### Redeem

```solidity
function redeem(
    address yoVault,        // target vault
    uint256 shares,         // amount of yoTokens to redeem
    uint256 minAssetsOut,   // minimum assets expected (slippage guard, instant only)
    address receiver,       // who receives the underlying
    uint32 partnerId        // attribution ID
) external returns (uint256 assetsOrRequestId)
```

**Preconditions:**
- User must `approve(gateway, shares)` on the yoToken (vault share token)
- `shares > 0`, `receiver != address(0)`

**Return value:**
- Non-zero = instant redemption (actual assets delivered)
- Zero = async (request queued, `REQUEST_ID = 0`)

**Slippage check** only applies to instant redemptions. For async, set `minAssetsOut = 0`.

### Read-Only Quotes

All quote functions validate the vault via registry first.

```solidity
function quoteConvertToShares(address yoVault, uint256 assets) external view returns (uint256)
function quoteConvertToAssets(address yoVault, uint256 shares) external view returns (uint256)
function quotePreviewDeposit(address yoVault, uint256 assets) external view returns (uint256)
function quotePreviewRedeem(address yoVault, uint256 shares) external view returns (uint256)
function quotePreviewWithdraw(address yoVault, uint256 assets) external view returns (uint256)
function getShareAllowance(address yoVault, address owner) external view returns (uint256)
function getAssetAllowance(address yoVault, address owner) external view returns (uint256)
```

## Integration Flow

```mermaid
sequenceDiagram
    actor Integrator
    participant SDK as @yo-protocol/core
    participant GW as YoGateway
    participant Token as Underlying ERC20
    participant Vault as YoVault

    Note over Integrator,Vault: Step 1: Discover Vaults

    Integrator->>SDK: getVaults()
    SDK-->>Integrator: VaultConfig[] (local registry)

    Integrator->>SDK: getVaultState(vault.address)
    SDK-->>Integrator: {totalAssets, totalSupply, exchangeRate, ...}

    Note over Integrator,Vault: Step 2: Preview

    Integrator->>GW: quotePreviewDeposit(vault, 1000e6)
    GW-->>Integrator: ~998e6 shares (accounting for fees)

    Note over Integrator,Vault: Step 3: Approve

    Integrator->>Token: approve(gateway, 1000e6)

    Note over Integrator,Vault: Step 4: Execute

    Integrator->>GW: deposit(vault, 1000e6, 990e6, receiver, 42)
    GW->>Token: safeTransferFrom(integrator, gateway, 1000e6)
    GW->>Token: forceApprove(vault, 1000e6)
    GW->>Vault: deposit(1000e6, receiver)
    Vault-->>GW: 998e6 shares
    GW->>GW: 998e6 >= 990e6 ✓
    GW->>GW: emit YoGatewayDeposit(42, vault, integrator, receiver, 1000e6, 998e6)
    GW-->>Integrator: 998e6
```

## Partner Attribution

The `partnerId` is a `uint32` that appears in gateway events for off-chain tracking:

```solidity
event YoGatewayDeposit(
    uint32 indexed partnerId,    // ← indexed for efficient filtering
    address indexed yoVault,
    address indexed sender,
    address receiver,
    uint256 assets,
    uint256 shares
);
```

- Default `partnerId` in SDK: `9999` (unattributed)
- Partners must register with YO to receive a custom ID
- Used for tracking volumes, revenue sharing, and analytics

## Error Handling

```mermaid
flowchart TD
    A[Gateway Call] --> B{assets/shares == 0?}
    B -->|Yes| E1[Gateway__ZeroAmount]
    B -->|No| C{receiver == 0?}
    C -->|Yes| E2[Gateway__ZeroReceiver]
    C -->|No| D{registry.isYoVault?}
    D -->|No| E3[Gateway__VaultNotAllowed]
    D -->|Yes| F[Execute vault call]
    F --> G{Deposit: sharesOut < minSharesOut?}
    G -->|Yes| E4[Gateway__InsufficientSharesOut]
    G -->|No| H[Success]
    F --> I{Redeem instant: assets < minAssetsOut?}
    I -->|Yes| E5[Gateway__InsufficientAssetsOut]
    I -->|No| H
```

## Contract Addresses

| Contract | Base | Ethereum |
|----------|------|----------|
| **YoGateway** | `0xF1EeE0957267b1A474323Ff9CfF7719E964969FA` | `0xF1EeE0957267b1A474323Ff9CfF7719E964969FA` |
| **YoRegistry** | `0x56c3119DC3B1a75763C87D5B0A2C55E489502232` | `0x56c3119DC3B1a75763C87D5B0A2C55E489502232` |

## Important Notes for Integrators

1. **Approve to Gateway, not Vault** — The gateway pulls tokens from the user and forwards them
2. **Two approvals needed for redeem** — Approve yoTokens (shares) to gateway
3. **Slippage protection** — Always use `quotePreviewDeposit`/`quotePreviewRedeem` to compute min amounts, then subtract a buffer (e.g., 0.5%)
4. **Async redeems have no slippage check** — Set `minAssetsOut = 0` when expecting async
5. **Gas considerations** — Gateway adds ~30k gas overhead vs direct vault interaction due to registry check and token routing
