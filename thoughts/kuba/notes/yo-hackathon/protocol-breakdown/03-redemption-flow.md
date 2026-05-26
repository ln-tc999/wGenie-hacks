# YO Protocol — Redemption Flow

## User Story

As a user, I want to redeem my yoTokens (yoUSD/yoETH/yoBTC) back to the underlying asset (USDC/WETH/cbBTC). The redemption may be instant (if vault has liquidity) or queued (up to 24 hours).

---

## Key Design Decision

**`withdraw()` is permanently disabled** — it always reverts with `UseRequestRedeem`. Users must use `requestRedeem()` (or the gateway's `redeem()`). This is because the vault may not have sufficient on-chain liquidity at any given moment.

---

## Redemption Decision Flow

```mermaid
flowchart TD
    A[User calls requestRedeem<br/>shares, receiver, owner] --> B{Validations}
    B -->|receiver = 0| ERR1[Revert: ZeroReceiver]
    B -->|shares = 0| ERR2[Revert: SharesAmountZero]
    B -->|owner != msg.sender| ERR3[Revert: NotSharesOwner]
    B -->|shares > balance| ERR4[Revert: InsufficientShares]
    B -->|All pass| C[Compute assetsWithFee<br/>= previewRedeem'shares']

    C --> D{vault.balanceOf'asset' - totalPendingAssets<br/>>= assetsWithFee?}

    D -->|Yes: Sufficient Liquidity| E[INSTANT PATH]
    D -->|No: Insufficient Liquidity| F[ASYNC PATH]

    E --> E1[Burn shares from owner]
    E1 --> E2[Transfer assets - fee to receiver]
    E2 --> E3[Transfer fee to feeRecipient]
    E3 --> E4[Emit RedeemRequest<br/>instant = true]
    E4 --> E5[Return assetsWithFee]

    F --> F1[Transfer shares to vault address]
    F1 --> F2[Record pending:<br/>_pendingRedeem'receiver'.shares += shares<br/>_pendingRedeem'receiver'.assets += assetsWithFee]
    F2 --> F3[totalPendingAssets += assetsWithFee]
    F3 --> F4[Emit RedeemRequest<br/>instant = false]
    F4 --> F5[Return 0 'REQUEST_ID']
```

## Instant Redemption Sequence

```mermaid
sequenceDiagram
    actor User
    participant Gateway as YoGateway
    participant Vault as YoVault
    participant Token as Underlying ERC20

    User->>Token: approve(gateway, shares)
    Note over User: Approve yoToken shares to gateway
    User->>Gateway: redeem(vault, shares, minAssetsOut, receiver, partnerId)

    Gateway->>Vault: requestRedeem(shares, receiver, gateway)

    Vault->>Vault: Compute assetsWithFee
    Vault->>Vault: Check: availableBalance >= assetsWithFee ✓

    Vault->>Vault: Burn shares
    Vault->>Token: transfer(receiver, assets - fee)
    Vault->>Token: transfer(feeRecipient, fee)
    Vault->>Vault: emit RedeemRequest(instant=true)
    Vault-->>Gateway: assetsWithFee (non-zero)

    Gateway->>Gateway: Check: assetsWithFee >= minAssetsOut
    Gateway->>Gateway: emit YoGatewayRedeem(partnerId, vault, receiver, shares, assetsWithFee, instant=true)
    Gateway-->>User: assetsWithFee
```

## Async Redemption Sequence (Queued)

```mermaid
sequenceDiagram
    actor User
    participant Gateway as YoGateway
    participant Vault as YoVault
    participant Token as Underlying ERC20
    actor Operator

    Note over User,Operator: Phase 1: User Requests Redemption

    User->>Gateway: redeem(vault, shares, 0, receiver, partnerId)
    Note over User: minAssetsOut=0 for async (no slippage check)

    Gateway->>Vault: requestRedeem(shares, receiver, gateway)
    Vault->>Vault: Compute assetsWithFee
    Vault->>Vault: Check: availableBalance < assetsWithFee ✗

    Vault->>Vault: Transfer shares to vault's own address
    Vault->>Vault: _pendingRedeem[receiver] += {assets, shares}
    Vault->>Vault: totalPendingAssets += assetsWithFee
    Vault->>Vault: emit RedeemRequest(instant=false)
    Vault-->>Gateway: 0 (REQUEST_ID)

    Gateway->>Gateway: emit YoGatewayRedeem(instant=false)
    Gateway-->>User: 0

    Note over User,Operator: Phase 2: Operator Fulfills (up to 24h later)

    Operator->>Operator: Source assets (bridge, rebalance, etc.)
    Operator->>Token: transfer(vault, requiredAssets)

    Note over Operator: Read pending state
    Operator->>Vault: pendingRedeemRequest(receiver)
    Vault-->>Operator: (pendingAssets, pendingShares)

    Operator->>Vault: fulfillRedeem(receiver, pendingShares, pendingAssets)
    Vault->>Vault: Decrease pending state
    Vault->>Vault: totalPendingAssets -= pendingAssets
    Vault->>Vault: Burn shares from vault's address
    Vault->>Token: transfer(receiver, assets - fee)
    Vault->>Token: transfer(feeRecipient, fee)
    Vault->>Vault: emit RequestFulfilled(receiver, shares, assets)
```

## Cancellation Flow

```mermaid
sequenceDiagram
    actor Operator
    participant Vault as YoVault

    Operator->>Vault: pendingRedeemRequest(receiver)
    Vault-->>Operator: (pendingAssets, pendingShares)

    Operator->>Vault: cancelRedeem(receiver, pendingShares, pendingAssets)
    Vault->>Vault: Decrease pending state
    Vault->>Vault: totalPendingAssets -= pendingAssets
    Vault->>Vault: Transfer shares from vault back to receiver
    Vault->>Vault: emit RequestCancelled(receiver, shares, assets)

    Note over Vault: Shares are returned, no assets move
```

## Full Async Lifecycle (from tests)

This is the complete pattern observed in the test suite:

```mermaid
sequenceDiagram
    actor User as Alice
    actor Admin as Operator
    participant Vault as YoVault
    participant Token as USDC

    Note over User,Token: 1. Initial deposit
    User->>Token: approve(vault, MAX)
    User->>Vault: deposit(1000e6, alice)
    Vault-->>User: 1000e6 shares

    Note over User,Token: 2. Admin deploys capital externally
    Admin->>Vault: manage(usdc, transfer(admin, 1000e6), 0)
    Admin->>Vault: onUnderlyingBalanceUpdate(1000e6)
    Note over Vault: Vault now has 0 USDC on-hand<br/>but tracks 1000e6 underlying

    Note over User,Token: 3. User requests redemption → ASYNC
    User->>Vault: requestRedeem(1000e6 shares, alice, alice)
    Vault-->>User: 0 (queued)

    Note over User,Token: 4. Admin returns capital
    Note over Admin: vm.roll(block.number + 1)
    Admin->>Token: transfer(vault, 1000e6)
    Admin->>Vault: onUnderlyingBalanceUpdate(0)

    Note over User,Token: 5. Admin fulfills pending redeem
    Admin->>Vault: pendingRedeemRequest(alice) → (1000e6, 1000e6)
    Admin->>Vault: fulfillRedeem(alice, 1000e6, 1000e6)
    Vault->>Token: transfer(alice, assets - fee)
```

## Gateway vs Direct Vault Redemption

| Feature | Gateway `redeem()` | Direct `requestRedeem()` |
|---------|-------------------|-------------------------|
| Slippage protection | Built-in (`minAssetsOut`) | None |
| Partner attribution | Via `partnerId` | None |
| Approval target | Approve shares to **gateway** | Approve shares to **vault** |
| Owner parameter | Gateway is both owner and caller | `owner` must equal `msg.sender` |
| Return value | Same: assets (instant) or 0 (async) | Same |

## Reading Pending State

```solidity
// On-chain: check pending redemption for a user
(uint256 pendingAssets, uint256 pendingShares) = yoVault.pendingRedeemRequest(userAddress);

// Total pending across all users
uint256 totalPending = yoVault.totalPendingAssets();
```

```typescript
// Via SDK
const pending = await client.getPendingRedemptions(vault.address, userAddress)

// Via REST API
// GET https://api.yo.xyz/api/v1/vault/pending-redeems/{network}/{vaultAddress}
```

## Integration Code Examples

### Via SDK (TypeScript)

```typescript
import { createYoClient, VAULTS } from '@yo-protocol/core'

const client = createYoClient({ chainId: 8453, walletClient })
const vault = VAULTS.yoUSD

// Get user's shares
const shares = await client.getShareBalance(vault.address, userAddress)

// Redeem
const result = await client.redeem({ vault: vault.address, shares, slippageBps: 50 })

// Check if instant or queued
const receipt = await client.waitForRedeemReceipt(result.hash)
if (receipt.instant) {
  console.log('Assets received immediately:', receipt.assetsOrRequestId)
} else {
  console.log('Queued — check back in up to 24 hours')
  const pending = await client.getPendingRedemptions(vault.address, userAddress)
}
```
