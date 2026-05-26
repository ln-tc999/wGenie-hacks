# YO Protocol — Oracle System

## Overview

YO Protocol uses three distinct oracle patterns depending on the vault version. The oracle determines the share price (exchange rate between yoTokens and underlying assets).

```mermaid
flowchart LR
    subgraph "V1: Push-Based"
        OP1[Operator] -->|onUnderlyingBalanceUpdate| VV1[YoVault V1]
        VV1 -->|computes price internally| VV1
    end

    subgraph "V2: Pull-Based"
        UP[Updater] -->|updateSharePrice| OR[YoOracle]
        VV2[YoVault V2] -->|getLatestPrice| OR
        VU[yoUSDT] -->|getLatestPrice<br/>keyed on yoUSD| OR
    end

    subgraph "Secondary: Direct Push"
        OP2[Operator] -->|onSharePriceUpdate| VS[YoSecondaryVault]
    end
```

---

## Pattern 1: V1 Push-Based (YoVault)

The operator pushes the total off-chain balance to the vault. The vault computes price internally.

```mermaid
sequenceDiagram
    actor Operator
    participant Vault as YoVault V1

    Operator->>Vault: onUnderlyingBalanceUpdate(newAggregatedBalance)

    Vault->>Vault: Check: block.number > lastBlockUpdated
    Vault->>Vault: newTotalAssets = balanceOf(vault) + newAggregatedBalance
    Vault->>Vault: newPrice = newTotalAssets * 1e18 / totalSupply

    alt Price change > maxPercentageChange
        Vault->>Vault: _pause() — vault freezes
        Note over Vault: Does NOT update state
    else Price change within bounds
        Vault->>Vault: aggregatedUnderlyingBalances = newAggregatedBalance
        Vault->>Vault: lastPricePerShare = newPrice
        Vault->>Vault: lastBlockUpdated = block.number
        Vault->>Vault: emit UnderlyingBalanceUpdated
    end
```

### Key Properties

- One update per block maximum (`block.number > lastBlockUpdated`)
- Auto-pause if price change exceeds `maxPercentageChange` (default 1%, max 10%)
- `totalAssets() = IERC20(asset).balanceOf(vault) + aggregatedUnderlyingBalances`
- Standard ERC4626 share conversion: `shares = assets * totalSupply / totalAssets`

---

## Pattern 2: V2 Pull-Based (YoOracle)

A standalone oracle contract stores per-vault share prices. Vaults pull the price on every conversion.

### Oracle Architecture

```mermaid
flowchart TD
    subgraph YoOracle
        UP[Updater Address] -->|updateSharePrice| OD[oracleData mapping]
        OD -->|per-vault| D1[yoUSD: latestPrice, anchorPrice, timestamps]
        OD -->|per-vault| D2[yoETH: latestPrice, anchorPrice, timestamps]
        OD -->|per-vault| D3[yoBTC: latestPrice, anchorPrice, timestamps]
    end

    V2[YoVault_V2] -->|getLatestPrice<br/>address=self| OD
    VT[yoUSDT] -->|getLatestPrice<br/>address=YO_USD| OD

    OW[Owner] -->|setAssetConfig| OD
    OW -->|setUpdater| UP
```

### Anchor-Based Circuit Breaker

The oracle maintains two price tiers per vault to prevent manipulation:

```mermaid
stateDiagram-v2
    [*] --> FirstUpdate: updateSharePrice(vault, price)

    FirstUpdate --> Normal: Sets both latestPrice=price<br/>and anchorPrice=price

    Normal --> PriceCheck: updateSharePrice(vault, newPrice)

    PriceCheck --> Updated: diffBps <= maxChangeBps
    PriceCheck --> Reverted: diffBps > maxChangeBps

    Updated --> AnchorCheck: Check window

    AnchorCheck --> AnchorRotated: timestamp - anchorTimestamp >= windowSeconds
    AnchorCheck --> Normal: Window not elapsed

    AnchorRotated --> Normal: anchorPrice = newPrice<br/>anchorTimestamp = now

    Reverted --> Normal: Revert PriceChangeTooBig

    note right of PriceCheck
        diffBps = |newPrice - anchorPrice| * BPS_DENOMINATOR / anchorPrice
        BPS_DENOMINATOR = 1,000,000,000 (1e9)
    end note
```

### Update Flow

```mermaid
sequenceDiagram
    actor Updater
    participant Oracle as YoOracle
    participant Vault as YoVault V2

    Note over Updater,Oracle: Price Update

    Updater->>Oracle: updateSharePrice(vault, 1.05e18)

    Oracle->>Oracle: Check: msg.sender == updater
    Oracle->>Oracle: Read per-vault config (or defaults)

    alt First update (latestPrice == 0)
        Oracle->>Oracle: latestPrice = anchorPrice = 1.05e18
        Oracle->>Oracle: latestTimestamp = anchorTimestamp = now
    else Subsequent update
        Oracle->>Oracle: diffBps = |newPrice - anchorPrice| * 1e9 / anchorPrice

        alt diffBps > maxChangeBps
            Oracle->>Oracle: REVERT PriceChangeTooBig
        else Within bounds
            Oracle->>Oracle: latestPrice = newPrice
            Oracle->>Oracle: latestTimestamp = now

            alt Window elapsed (now - anchorTimestamp >= windowSeconds)
                Oracle->>Oracle: anchorPrice = newPrice
                Oracle->>Oracle: anchorTimestamp = now
            end
        end
    end

    Oracle->>Oracle: emit SharePriceUpdated(vault, price, timestamp)

    Note over Updater,Oracle: Price Read (on user deposit/redeem)

    Vault->>Oracle: getLatestPrice(address(this))
    Oracle-->>Vault: (pricePerShare, timestamp)
    Vault->>Vault: shares = assets * 10^decimals / pricePerShare
```

### Per-Vault Configuration

The owner can override oracle parameters per vault:

```solidity
oracle.setAssetConfig(
    vaultAddress,
    windowSeconds,    // how often anchor rotates (0 = use default)
    maxChangeBps      // max deviation from anchor (0 = use default)
);
```

| Parameter | Default | Unit | Meaning |
|-----------|---------|------|---------|
| `DEFAULT_WINDOW_SECONDS` | 86,400 (1 day) | seconds | Anchor rotation interval |
| `DEFAULT_MAX_CHANGE_BPS` | 1,000,000 | BPS (1e9 base) | 0.1% max deviation |
| `BPS_DENOMINATOR` | 1,000,000,000 | - | 1e9 (NOT the usual 10,000) |

### V2 Share Conversion

```solidity
// _convertToShares (V2):
(uint256 pricePerShare, ) = IYoOracle(ORACLE_ADDRESS).getLatestPrice(address(this));
shares = assets * 10^decimals / pricePerShare;

// _convertToAssets (V2):
assets = shares * pricePerShare / 10^decimals;

// totalAssets (V2):
(uint256 price, ) = IYoOracle(ORACLE_ADDRESS).getLatestPrice(address(this));
totalAssets = price * totalSupply / 10^decimals;
```

### yoUSDT Oracle Distinction

`yoUSDT` uses `getLatestPrice(YO_USD_ADDRESS)` instead of `getLatestPrice(address(this))`. This means:
- yoUSDT and yoUSD share the **exact same exchange rate**
- The oracle only needs one price entry for both vaults
- Holding yoUSDT or yoUSD gives identical yield exposure

---

## Pattern 3: Secondary Vault Direct Push

For cross-chain secondary instances where the canonical price is computed on another chain.

```mermaid
sequenceDiagram
    actor Operator
    participant Vault as YoSecondaryVault

    Operator->>Vault: onSharePriceUpdate(newSharePrice)

    Vault->>Vault: Check: requiresAuth
    Vault->>Vault: Check: block.number > lastBlockUpdated

    Vault->>Vault: percentageChange = |lastPricePerShare - newSharePrice| / lastPricePerShare

    alt percentageChange > maxPercentageChange
        Vault->>Vault: _pause() — vault freezes
    else Within bounds
        Vault->>Vault: lastPricePerShare = newSharePrice
        Vault->>Vault: lastBlockUpdated = block.number
        Vault->>Vault: emit SharePriceUpdated
    end
```

Note: `onUnderlyingBalanceUpdate()` is **blocked** on secondary vaults — reverts with `UseOnSharePriceUpdate`.

---

## Comparison

| Feature | V1 (YoVault) | V2 (YoOracle) | Secondary |
|---------|-------------|---------------|-----------|
| Price computation | Vault computes from balance | Oracle stores externally | Directly pushed |
| Update trigger | `onUnderlyingBalanceUpdate()` | `updateSharePrice()` on oracle | `onSharePriceUpdate()` |
| Circuit breaker | Auto-pause in vault | `PriceChangeTooBig` revert in oracle | Auto-pause in vault |
| Update frequency | 1 per block | Unlimited (oracle has no block guard) | 1 per block |
| Access control | `requiresAuth` on vault | `updater` address on oracle | `requiresAuth` on vault |
| Upgradeable | Yes (proxy) | No (plain deploy) | Yes (proxy) |
