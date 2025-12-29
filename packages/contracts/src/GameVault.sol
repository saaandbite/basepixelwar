// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IGameVault} from "./IGameVault.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title GameVault
/// @notice Main vault contract for BasePixelWar (Chroma Duel)
/// @dev Handles deposits, round management, and prize payouts
contract GameVault is IGameVault, ReentrancyGuard, Pausable, AccessControl {
    // ============================================
    // CONSTANTS & ROLES
    // ============================================
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    /// @notice Minimum deposit amount (0.0001 ETH)
    uint256 public constant MIN_DEPOSIT = 0.0001 ether;
    
    /// @notice Grace period for claiming prizes (30 days)
    uint256 public constant CLAIM_GRACE_PERIOD = 30 days;
    
    /// @notice Platform fee (5%)
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Player balances (deposited but not yet used in rounds)
    mapping(address => uint256) public playerBalances;
    
    /// @notice Round data storage
    mapping(uint256 => Round) public rounds;
    
    /// @notice Prize allocations per round per player
    mapping(uint256 => mapping(address => uint256)) public prizeAllocations;
    
    /// @notice Claimed status per round per player
    mapping(uint256 => mapping(address => bool)) public claimed;
    
    /// @notice Total platform fees collected
    uint256 public platformFees;
    
    /// @notice Treasury address for platform fees
    address public treasury;

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier roundExists(uint256 roundId) {
        require(rounds[roundId].exists, "Round does not exist");
        _;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /// @inheritdoc IGameVault
    function getPlayerBalance(address player) external view returns (uint256) {
        return playerBalances[player];
    }
    
    /// @inheritdoc IGameVault
    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }
    
    /// @inheritdoc IGameVault
    function getClaimableAmount(uint256 roundId, address player) external view returns (uint256) {
        if (claimed[roundId][player]) return 0;
        return prizeAllocations[roundId][player];
    }
    
    /// @inheritdoc IGameVault
    function hasClaimed(uint256 roundId, address player) external view returns (bool) {
        return claimed[roundId][player];
    }

    // ============================================
    // PLAYER FUNCTIONS
    // ============================================
    
    /// @inheritdoc IGameVault
    function deposit() external payable whenNotPaused nonReentrant {
        require(msg.value >= MIN_DEPOSIT, "Below minimum deposit");
        
        playerBalances[msg.sender] += msg.value;
        
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    
    /// @inheritdoc IGameVault
    function claimPrize(uint256 roundId) external nonReentrant roundExists(roundId) {
        Round storage round = rounds[roundId];
        
        require(round.ended, "Round not ended");
        require(!claimed[roundId][msg.sender], "Already claimed");
        
        uint256 amount = prizeAllocations[roundId][msg.sender];
        require(amount > 0, "No prize to claim");
        
        claimed[roundId][msg.sender] = true;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PrizeClaimed(roundId, msg.sender, amount);
    }

    // ============================================
    // OPERATOR FUNCTIONS
    // ============================================
    
    /// @inheritdoc IGameVault
    function startRound(
        uint256 roundId,
        uint256 duration
    ) external payable onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(!rounds[roundId].exists, "Round already exists");
        require(duration > 0, "Invalid duration");
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        rounds[roundId] = Round({
            prizePool: msg.value,
            startTime: startTime,
            endTime: endTime,
            ended: false,
            exists: true
        });
        
        emit RoundStarted(roundId, msg.value, startTime, endTime);
    }
    
    /// @inheritdoc IGameVault
    function endRound(
        uint256 roundId,
        address[] calldata winners,
        uint256[] calldata shares
    ) external onlyRole(OPERATOR_ROLE) roundExists(roundId) {
        Round storage round = rounds[roundId];
        
        require(!round.ended, "Round already ended");
        require(winners.length == shares.length, "Array length mismatch");
        require(winners.length > 0, "No winners");
        
        round.ended = true;
        
        // Calculate platform fee
        uint256 fee = (round.prizePool * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 distributablePool = round.prizePool - fee;
        platformFees += fee;
        
        // Validate total shares equals 100%
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == BPS_DENOMINATOR, "Shares must equal 100%");
        
        // Allocate prizes
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 prizeAmount = (distributablePool * shares[i]) / BPS_DENOMINATOR;
            prizeAllocations[roundId][winners[i]] = prizeAmount;
        }
        
        emit RoundEnded(roundId, winners, shares);
    }
    
    /// @inheritdoc IGameVault
    function withdrawUnclaimed(uint256 roundId) external onlyRole(OPERATOR_ROLE) roundExists(roundId) {
        Round storage round = rounds[roundId];
        
        require(round.ended, "Round not ended");
        require(block.timestamp > round.endTime + CLAIM_GRACE_PERIOD, "Grace period not over");
        
        // Calculate unclaimed amount (expensive, but only called once per round)
        uint256 unclaimed = 0;
        // Note: In production, track unclaimed separately
        
        emit UnclaimedWithdrawn(roundId, unclaimed);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /// @notice Withdraw platform fees to treasury
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 amount = platformFees;
        require(amount > 0, "No fees to withdraw");
        
        platformFees = 0;
        
        (bool success, ) = treasury.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /// @notice Update treasury address
    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /// @notice Pause the contract
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /// @notice Unpause the contract
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /// @notice Grant operator role
    function addOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(OPERATOR_ROLE, operator);
    }
    
    /// @notice Revoke operator role
    function removeOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(OPERATOR_ROLE, operator);
    }

    // ============================================
    // EMERGENCY FUNCTIONS
    // ============================================
    
    /// @notice Emergency withdraw all ETH (only when paused)
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = treasury.call{value: balance}("");
        require(success, "Transfer failed");
    }

    // ============================================
    // RECEIVE & FALLBACK
    // ============================================
    
    /// @notice Allow receiving ETH directly (treated as deposit)
    receive() external payable {
        if (msg.value >= MIN_DEPOSIT) {
            playerBalances[msg.sender] += msg.value;
            emit Deposited(msg.sender, msg.value, block.timestamp);
        }
    }
}
