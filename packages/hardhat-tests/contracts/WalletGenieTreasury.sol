// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title WalletGenieTreasury
/// @notice Simple treasury vault managed by AI CFO agent on Mantle
/// @dev Deployer menjadi owner, address CFO agent menjadi manager
contract WalletGenieTreasury {
    address public owner;
    address public manager;
    bool public paused;

    struct GuardrailConfig {
        uint256 dailyLimit;       // Max value (wei) allowed per day
        uint256 maxPerTx;         // Max value (wei) allowed per transaction
        uint256 usedToday;        // Amount (wei) spent today
        uint256 lastReset;        // Day index (block.timestamp / 1 days)
    }

    GuardrailConfig public guardrail;
    mapping(address => bool) public whitelistedTargets;
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event ManagerUpdated(address indexed manager);
    event Paused(bool paused);
    event Executed(address indexed target, uint256 value, bytes data);

    event DailyLimitUpdated(uint256 dailyLimit);
    event MaxPerTxUpdated(uint256 maxPerTx);
    event WhitelistTargetUpdated(address indexed target, bool allowed);
    event GuardrailReset(uint256 lastReset);

    modifier onlyOwner() {
        require(msg.sender == owner, "Treasury: not owner");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager || msg.sender == owner, "Treasury: not manager or owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Treasury: paused");
        _;
    }

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;

        // Default whitelist setup for Merchant Moe Router and Aave Pool so initial run doesn't fail
        whitelistedTargets[0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a] = true; // Merchant Moe Router
        whitelistedTargets[0x458F293454fE0d67EC0655f3672301301DD51422] = true; // Aave V3 Pool

        // Default daily limits: 1000 MNT
        guardrail.dailyLimit = 1000 * 1e18;
        guardrail.maxPerTx = 500 * 1e18;
        guardrail.lastReset = block.timestamp / 1 days;
    }

    /// @notice Deposit native MNT into treasury
    function deposit() external payable notPaused {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw native MNT from treasury
    function withdraw(uint256 amount) external notPaused {
        require(balances[msg.sender] >= amount, "Treasury: insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Execute arbitrary call (only manager or owner)
    /// @dev Used for swaps on Merchant Moe, deposits into lending protocols, etc.
    function execute(address target, uint256 value, bytes calldata data)
        external onlyManager notPaused returns (bytes memory)
    {
        // Enforce whitelist
        require(whitelistedTargets[target], "Treasury: target not whitelisted");

        // Enforce daily limits
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > guardrail.lastReset) {
            guardrail.usedToday = 0;
            guardrail.lastReset = currentDay;
            emit GuardrailReset(currentDay);
        }

        require(value <= guardrail.maxPerTx, "Treasury: exceeds max per tx limit");
        require(guardrail.usedToday + value <= guardrail.dailyLimit, "Treasury: daily limit exceeded");

        guardrail.usedToday += value;

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Treasury: execute failed");
        emit Executed(target, value, data);
        return result;
    }

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
        emit ManagerUpdated(_manager);
    }

    function togglePause() external onlyOwner {
        paused = !paused;
        emit Paused(paused);
    }

    function setDailyLimit(uint256 _dailyLimit) external onlyOwner {
        guardrail.dailyLimit = _dailyLimit;
        emit DailyLimitUpdated(_dailyLimit);
    }

    function setMaxPerTx(uint256 _maxPerTx) external onlyOwner {
        guardrail.maxPerTx = _maxPerTx;
        emit MaxPerTxUpdated(_maxPerTx);
    }

    // Solves settings requirement for whitelisting protocols
    function setWhitelistTarget(address target, bool allowed) external onlyOwner {
        whitelistedTargets[target] = allowed;
        emit WhitelistTargetUpdated(target, allowed);
    }

    receive() external payable {}
}
