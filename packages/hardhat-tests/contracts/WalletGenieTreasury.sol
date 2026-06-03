// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title WalletGenieTreasury
/// @notice Simple treasury vault managed by AI CFO agent on Mantle
/// @dev Deployer menjadi owner, address CFO agent menjadi manager
contract WalletGenieTreasury {
    address public owner;
    address public manager;
    bool public paused;

    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event ManagerUpdated(address indexed manager);
    event Paused(bool paused);
    event Executed(address indexed target, uint256 value, bytes data);

    modifier onlyOwner() {
        require(msg.sender == owner, "Treasury: not owner");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Treasury: not manager");
        _;
    }

    modifier notPaused() {
        require(!paused, "Treasury: paused");
        _;
    }

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
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

    /// @notice Execute arbitrary call (only manager = CFO agent)
    /// @dev Used for swaps on Merchant Moe, deposits into lending protocols, etc.
    function execute(address target, uint256 value, bytes calldata data)
        external onlyManager notPaused returns (bytes memory)
    {
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

    receive() external payable {}
}
