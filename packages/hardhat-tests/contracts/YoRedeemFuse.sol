// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

/// @title YoRedeemFuse — share-denominated withdrawal from YO vaults
/// @notice Calls ERC-4626 `redeem()` instead of `withdraw()`, which YO vaults disable.
///         Runs via delegatecall from PlasmaVault, so `address(this)` == PlasmaVault == share owner.

// Minimal IFuseCommon — PlasmaVault checks MARKET_ID before executing
interface IFuseCommon {
    function MARKET_ID() external view returns (uint256);
}

// Minimal IERC4626 subset needed by this fuse
interface IERC4626 {
    function balanceOf(address account) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
}

struct YoRedeemFuseExitData {
    address vault;
    uint256 shares;
}

error AsyncRedemptionNotSupported();

event YoRedeemFuseExit(address indexed vault, uint256 assetsReceived, uint256 sharesBurned);

contract YoRedeemFuse is IFuseCommon {
    uint256 public immutable MARKET_ID;

    constructor(uint256 marketId_) {
        MARKET_ID = marketId_;
    }

    /// @notice Redeem shares from a YO vault. Reverts if redemption is async (returns 0 assets).
    function exit(YoRedeemFuseExitData calldata data_) external {
        uint256 shares = data_.shares;
        uint256 balance = IERC4626(data_.vault).balanceOf(address(this));

        // Cap at actual balance
        if (shares > balance) {
            shares = balance;
        }
        if (shares == 0) return;

        uint256 assetsReceived = IERC4626(data_.vault).redeem(shares, address(this), address(this));

        if (assetsReceived == 0) {
            revert AsyncRedemptionNotSupported();
        }

        emit YoRedeemFuseExit(data_.vault, assetsReceived, shares);
    }
}
