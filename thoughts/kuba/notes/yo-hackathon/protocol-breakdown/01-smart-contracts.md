# YO Protocol Smart Contracts Reference

## Source: `external/core/src/`

Built with Foundry, Solidity 0.8.28, OpenZeppelin Contracts 5.1.0/5.2.0 upgradeable, Solmate 6.8.0.

---

## YoVault (V1)

**File:** `src/YoVault.sol`
**Inheritance:** `ERC4626Upgradeable + Compatible + IYoVault + AuthUpgradeable + PausableUpgradeable`
**Proxy:** `TransparentUpgradeableProxy`

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `aggregatedUnderlyingBalances` | `uint256` | Off-chain balances pushed by oracle |
| `lastBlockUpdated` | `uint256` | Block number of last oracle update |
| `lastPricePerShare` | `uint256` | Stored price computed after oracle push |
| `maxPercentageChange` | `uint256` | Threshold for auto-pause (default: 1e16 = 1%) |
| `totalPendingAssets` | `uint256` | Total assets reserved for pending redeems |
| `feeOnWithdraw` | `uint256` | Exit fee (max < 1e17 = 10%) |
| `feeOnDeposit` | `uint256` | Entry fee (max < 1e17 = 10%) |
| `feeRecipient` | `address` | Fee collector (no fee if zero) |
| `_pendingRedeem` | `mapping(address => PendingRedeem)` | Per-user pending redemption state |

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `REQUEST_ID` | `0` | Returned for async redeem requests |
| `DENOMINATOR` | `1e18` | 100% for fee/percentage math |
| `MAX_FEE` | `1e17` | 10% maximum fee |
| `MAX_PERCENTAGE_THRESHOLD` | `1e17` | 10% max price swing before auto-pause |

### Public/External Functions

**User-facing (whenNotPaused):**

```solidity
function deposit(uint256 assets, address receiver) public returns (uint256 shares)
function mint(uint256 shares, address receiver) public returns (uint256 assets)
function requestRedeem(uint256 shares, address receiver, address owner) public returns (uint256)
function redeem(uint256 shares, address receiver, address owner) public returns (uint256)
function withdraw(uint256, address, address) public  // ALWAYS REVERTS — use requestRedeem
```

**View functions:**

```solidity
function previewDeposit(uint256 assets) public view returns (uint256 shares)
function previewMint(uint256 shares) public view returns (uint256 assets)
function previewRedeem(uint256 shares) public view returns (uint256 assets)
function previewWithdraw(uint256 assets) public view returns (uint256 shares)
function maxDeposit(address) public view returns (uint256)   // 0 when paused
function maxMint(address) public view returns (uint256)      // 0 when paused
function maxWithdraw(address) public view returns (uint256)  // 0 when paused
function maxRedeem(address) public view returns (uint256)    // 0 when paused
function totalAssets() public view returns (uint256)
function pendingRedeemRequest(address user) public view returns (uint256 assets, uint256 shares)
```

**Operator-only (requiresAuth):**

```solidity
function fulfillRedeem(address receiver, uint256 shares, uint256 assetsWithFee) external
function cancelRedeem(address receiver, uint256 shares, uint256 assetsWithFee) external
function pause() public
function unpause() public
function manage(address target, bytes calldata data, uint256 value) external
function manage(address[] targets, bytes[] data, uint256[] values) external
function onUnderlyingBalanceUpdate(uint256 newAggregatedBalance) external
function updateMaxPercentageChange(uint256 newMaxPercentageChange) external
function updateWithdrawFee(uint256 newFee) external
function updateDepositFee(uint256 newFee) external
function updateFeeRecipient(address newFeeRecipient) external
```

### Initializer

```solidity
function initialize(IERC20 _asset, address _owner, string _name, string _symbol) public initializer
// Sets maxPercentageChange = 1e16 (1%)
```

---

## YoVault_V2

**File:** `src/YoVault_V2.sol`
**Key difference:** Pull-based oracle pricing instead of push-based balance updates.

### Additional Constants

| Name | Value | Description |
|------|-------|-------------|
| `ORACLE_ADDRESS` | `0x6E879d0CcC85085A709eBf5539224f53d0D396B0` | Hardcoded oracle address |

### Deprecated Storage (layout-compatible with V1)

```solidity
uint256 public deprecated_aggregatedUnderlyingBalances;
uint256 public deprecated_lastBlockUpdated;
uint256 public deprecated_lastPricePerShare;
uint256 public deprecated_maxPercentageChange;
```

### Key Differences from V1

| Aspect | V1 | V2 |
|--------|----|----|
| `totalAssets()` | `balanceOf + aggregatedUnderlyingBalances` | `oraclePrice * totalSupply / 10^decimals` |
| `_convertToShares` | ERC4626 default | `assets * 10^decimals / pricePerShare` |
| `_convertToAssets` | ERC4626 default | `shares * pricePerShare / 10^decimals` |
| Price source | `onUnderlyingBalanceUpdate()` push | `IYoOracle.getLatestPrice()` pull |
| Auto-pause | On balance update exceeding threshold | Oracle's own `PriceChangeTooBig` revert |
| `lastPricePerShare` | Stored variable | View function reading oracle live |
| `onUnderlyingBalanceUpdate()` | Present | **Absent** |
| `updateMaxPercentageChange()` | Present | **Absent** |
| `getImplementation()` | Absent | **Present** (reads EIP-1967 slot) |

---

## yoUSDT

**File:** `src/yoUSDT.sol`
**Structurally identical to YoVault_V2** with two key differences:

### Additional Constants

| Name | Value | Description |
|------|-------|-------------|
| `YO_USD_ADDRESS` | `0x0000000f2eB9f69274678c76222B35eEc7588a65` | yoUSD vault address |
| `RELAY_PERCENTAGE` | `95e16` (95%) | Portion of deposits forwarded to yoUSD |

### Deposit Relay

After standard `_deposit` logic, yoUSDT adds:
```solidity
uint256 assetsAfterFee = assets - feeAmount;
uint256 relayAmount = assetsAfterFee * RELAY_PERCENTAGE / DENOMINATOR;
IERC20(asset()).safeTransfer(YO_USD_ADDRESS, relayAmount);
```

**95% of net deposits go to yoUSD, 5% stays for instant redemption liquidity.**

### Oracle Key

yoUSDT reads price from `getLatestPrice(YO_USD_ADDRESS)` — **not** its own address. Both yoUSDT and yoUSD share the same exchange rate.

---

## YoOracle

**File:** `src/YoOracle.sol`
**Inheritance:** `Ownable2Step + IYoOracle` (NOT upgradeable)

### State

```solidity
uint64 public immutable DEFAULT_WINDOW_SECONDS;   // anchor rotation interval
uint64 public immutable DEFAULT_MAX_CHANGE_BPS;   // max deviation
uint64 public constant BPS_DENOMINATOR = 1_000_000_000;  // 1e9
address public updater;                                    // sole price pusher
mapping(address => AssetOracleData) public oracleData;    // per-vault
```

### Functions

```solidity
function getLatestPrice(address _vault) external view returns (uint256 price, uint64 timestamp)
function getAnchor(address _vault) external view returns (uint256 price, uint64 timestamp)
function setUpdater(address _updater) external onlyOwner
function setAssetConfig(address _vault, uint32 windowSeconds, uint32 maxChangeBps) external onlyOwner
function updateSharePrice(address _vault, uint256 _sharePrice) external  // updater only
```

See [04-oracle-system.md](./04-oracle-system.md) for detailed mechanics.

---

## YoGateway

**File:** `src/YoGateway.sol`
**Inheritance:** `ReentrancyGuardUpgradeable + IYoGateway`

### Functions

```solidity
function initialize(address _registry) public initializer
function deposit(address yoVault, uint256 assets, uint256 minSharesOut, address receiver, uint32 partnerId) external returns (uint256)
function redeem(address yoVault, uint256 shares, uint256 minAssetsOut, address receiver, uint32 partnerId) external returns (uint256)

// Read-only (all validate via registry)
function quoteConvertToShares(address yoVault, uint256 assets) external view returns (uint256)
function quoteConvertToAssets(address yoVault, uint256 shares) external view returns (uint256)
function quotePreviewDeposit(address yoVault, uint256 assets) external view returns (uint256)
function quotePreviewRedeem(address yoVault, uint256 shares) external view returns (uint256)
function quotePreviewWithdraw(address yoVault, uint256 assets) external view returns (uint256)
function getShareAllowance(address yoVault, address owner) external view returns (uint256)
function getAssetAllowance(address yoVault, address owner) external view returns (uint256)
```

See [05-gateway-integration.md](./05-gateway-integration.md) for detailed integration guide.

---

## YoRegistry

**File:** `src/YoRegistry.sol`
**Inheritance:** `AuthUpgradeable + IYoRegistry`

```solidity
function initialize(address _owner, Authority _authority) public initializer
function addYoVault(address vaultAddress) external requiresAuth
function removeYoVault(address vaultAddress) external requiresAuth
function isYoVault(address vaultAddress) external view returns (bool)
function listYoVaults() external view returns (address[] memory)
```

---

## YoSecondaryVault

**File:** `src/YoSecondaryVault.sol`
**Inherits:** `YoVault` — overrides price conversion to use directly-pushed share price.

```solidity
function initializeV2(uint256 _lastPricePerShare) public reinitializer(2)
function onSharePriceUpdate(uint256 newSharePrice) external requiresAuth
// onUnderlyingBalanceUpdate() is BLOCKED — reverts UseOnSharePriceUpdate
```

Used for cross-chain secondary vaults where the canonical price is computed on another chain and bridged in.

---

## YoEscrow

**File:** `src/YoEscrow.sol`
**Not upgradeable.** Minimal asset-holding sidecar.

```solidity
constructor(address _vault)  // sets immutable VAULT
function withdraw(address asset, uint256 amount) external  // only callable by VAULT
```

---

## YoToken

**File:** `src/YoToken.sol`
**Inheritance:** `ERC20Upgradeable + AuthUpgradeable`

Transfer-gated ERC-20. All transfers require `requiresAuth`.

```solidity
function initialize(address _owner, string memory _name, string memory _symbol) public initializer
// Mints 1,000,000,000 * 10^decimals to _owner
function burn(uint256 amount) external  // also requires auth via _update
```

---

## Events Summary

### IYoVault Events

```solidity
event RedeemRequest(address indexed receiver, address indexed owner, uint256 assets, uint256 shares, bool indexed instant)
event RequestFulfilled(address indexed receiver, uint256 shares, uint256 assets)
event RequestCancelled(address indexed receiver, uint256 shares, uint256 assets)
event WithdrawFeeUpdated(uint256 lastFee, uint256 newFee)
event DepositFeeUpdated(uint256 lastFee, uint256 newFee)
event FeeRecipientUpdated(address lastFeeRecipient, address newFeeRecipient)
event MaxPercentageUpdated(uint256 lastMaxPercentage, uint256 newMaxPercentage)  // V1 only
event UnderlyingBalanceUpdated(uint256 lastUnderlyingBalance, uint256 newUnderlyingBalance)  // V1 only
```

### IYoGateway Events

```solidity
event YoGatewayDeposit(uint32 indexed partnerId, address indexed yoVault, address indexed sender, address receiver, uint256 assets, uint256 shares)
event YoGatewayRedeem(uint32 indexed partnerId, address indexed yoVault, address indexed receiver, uint256 shares, uint256 assetsOrRequestId, bool instant)
```

### IYoOracle Events

```solidity
event SharePriceUpdated(address indexed vault, uint256 price, uint64 timestamp)
event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater)
event AssetConfigUpdated(address indexed vault, uint32 windowSeconds, uint32 maxChangeBps)
```

### IYoRegistry Events

```solidity
event YoVaultAdded(address indexed asset, address indexed vault)
event YoVaultRemoved(address indexed asset, address indexed vault)
```
