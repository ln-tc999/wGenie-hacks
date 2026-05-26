# YO Protocol Overview

## What is YO?

YO Protocol is a **multi-chain DeFi yield optimizer** that pools user assets into ERC-4626 compliant vaults ("yoVaults"), automatically rebalancing capital across the highest **risk-adjusted** yield opportunities on Ethereum and Base.

- Users deposit assets (USDC, WETH, cbBTC, etc.) and receive yield-bearing **yoTokens** (yoUSD, yoETH, yoBTC)
- Capital is deployed to audited protocols: Morpho, Pendle, Euler, Aerodrome, Fluid, Balancer, Reserve Protocol
- Risk assessment via Exponential.fi ratings (protocol age, audit history, smart contract security)
- No management or performance fees — only necessary bridging costs shared among depositors

## Architecture at a Glance

```mermaid
graph TB
    subgraph Users
        U1[User / Wallet]
        U2[Protocol / dApp]
        U3[AI Agent]
    end

    subgraph "YO Entry Layer"
        GW[YoGateway<br/>Unified Entry Point<br/>Slippage Protection<br/>Partner Attribution]
        REG[YoRegistry<br/>Vault Allow-List]
    end

    subgraph "YO Vault Layer"
        V1[yoUSD Vault<br/>USDC → yoUSD]
        V2[yoETH Vault<br/>WETH → yoETH]
        V3[yoBTC Vault<br/>cbBTC → yoBTC]
        V4[yoEUR / yoGOLD / yoUSDT]
    end

    subgraph "YO Infrastructure"
        OR[YoOracle<br/>Share Price Feed]
        ESC[YoEscrow<br/>Asset Custody]
        AUTH[RolesAuthority<br/>Access Control]
    end

    subgraph "DeFi Protocols"
        P1[Morpho]
        P2[Pendle]
        P3[Euler]
        P4[Aerodrome]
        P5[Fluid / Balancer / ...]
    end

    U1 --> GW
    U2 --> GW
    U3 --> GW
    GW --> REG
    GW --> V1
    GW --> V2
    GW --> V3
    GW --> V4
    OR --> V1
    OR --> V2
    OR --> V3
    ESC --> V1
    AUTH --> V1
    AUTH --> V2
    AUTH --> V3
    V1 --> P1
    V1 --> P2
    V2 --> P3
    V2 --> P4
    V3 --> P5
```

## Key Design Principles

1. **ERC-4626 Standard** — All vaults implement the tokenized vault standard. Any ERC-4626 compatible protocol can integrate.

2. **Asynchronous Redemptions** — Withdrawals may complete instantly (if vault has liquidity) or be queued (up to 24h) for operator fulfillment. Inspired by ERC-7540.

3. **Embassy Architecture** — Each chain holds native assets. Cross-chain rebalancing is handled by operators, not user funds. No bridge exposure for depositors.

4. **Oracle-Driven Pricing** — Share prices are maintained by an external oracle with anchor-based circuit breakers, not computed from on-chain TVL alone.

5. **Role-Based Access** — Operator actions (fulfilling redeems, managing assets, pausing) are gated by a Solmate-derived `RolesAuthority` system.

## Contract Hierarchy

```mermaid
classDiagram
    class AuthUpgradeable {
        +owner: address
        +authority: Authority
        +requiresAuth() modifier
        +isAuthorized(user, sig) bool
        +setAuthority(newAuthority)
        +transferOwnership(newOwner)
    }

    class Compatible {
        +receive() payable
        +onERC721Received()
        +onERC1155Received()
        +onERC1155BatchReceived()
    }

    class IYoVault {
        +requestRedeem(shares, receiver, owner) uint256
        +RedeemRequest event
        +RequestFulfilled event
        +RequestCancelled event
    }

    class YoVault {
        +deposit(assets, receiver) shares
        +requestRedeem(shares, receiver, owner)
        +fulfillRedeem(receiver, shares, assets)
        +cancelRedeem(receiver, shares, assets)
        +manage(target, data, value)
        +pause() / unpause()
    }

    class YoVault_V2 {
        +ORACLE_ADDRESS: constant
        +lastPricePerShare() view
        +getImplementation() view
    }

    class yoUSDT {
        +YO_USD_ADDRESS: constant
        +RELAY_PERCENTAGE: 95%
    }

    class YoSecondaryVault {
        +onSharePriceUpdate(newPrice)
        +initializeV2(price)
    }

    class YoGateway {
        +deposit(vault, assets, minShares, receiver, partnerId)
        +redeem(vault, shares, minAssets, receiver, partnerId)
    }

    class YoOracle {
        +updateSharePrice(vault, price)
        +getLatestPrice(vault) view
        +setAssetConfig(vault, window, maxChange)
    }

    class YoRegistry {
        +addYoVault(vault)
        +removeYoVault(vault)
        +isYoVault(vault) bool
        +listYoVaults() address[]
    }

    class YoEscrow {
        +VAULT: immutable
        +withdraw(asset, amount)
    }

    class YoToken {
        +burn(amount)
        +_update() requiresAuth
    }

    AuthUpgradeable <|-- YoVault
    AuthUpgradeable <|-- YoRegistry
    AuthUpgradeable <|-- YoToken
    Compatible <|-- YoVault
    IYoVault <|.. YoVault
    YoVault <|-- YoSecondaryVault
    YoVault <|-- YoVault_V2
    YoVault_V2 <|-- yoUSDT
    YoGateway --> YoRegistry : validates
    YoGateway --> IYoVault : deposits/redeems
    YoVault_V2 --> YoOracle : reads price
    yoUSDT --> YoOracle : reads price
    YoVault --> YoEscrow : withdraws assets
```

## Vault Evolution

| Version | Pricing Model | Oracle Pattern | Key Feature |
|---------|--------------|----------------|-------------|
| **YoVault (V1)** | `balanceOf(vault) + aggregatedUnderlyingBalances` | Push: operator calls `onUnderlyingBalanceUpdate()` | Auto-pause on price deviation |
| **YoVault_V2** | Oracle price via `IYoOracle.getLatestPrice()` | Pull: vault reads oracle on every conversion | Hardcoded `ORACLE_ADDRESS` |
| **yoUSDT** | Same oracle as V2, keyed on `YO_USD_ADDRESS` | Pull: shares yoUSD's price feed | 95% deposit relay to yoUSD |
| **YoSecondaryVault** | Direct price push via `onSharePriceUpdate()` | Push: operator pushes pre-computed price | Cross-chain secondary instances |

## Files Reference

| Document | Contents |
|----------|----------|
| [01-smart-contracts.md](./01-smart-contracts.md) | Complete contract-by-contract reference |
| [02-deposit-flow.md](./02-deposit-flow.md) | Deposit mechanics with diagrams |
| [03-redemption-flow.md](./03-redemption-flow.md) | Instant + async redemption flows |
| [04-oracle-system.md](./04-oracle-system.md) | Oracle architecture and circuit breakers |
| [05-gateway-integration.md](./05-gateway-integration.md) | YoGateway as the integration surface |
| [06-sdk-reference.md](./06-sdk-reference.md) | TypeScript SDK and CLI reference |
| [07-contract-addresses.md](./07-contract-addresses.md) | Deployed addresses and vault registry |
| [08-access-control.md](./08-access-control.md) | Auth system, roles, and permissions |
