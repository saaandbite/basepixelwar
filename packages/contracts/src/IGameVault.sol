// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGameVault Interface
/// @notice Interface for the BasePixelWar GameVault contract
interface IGameVault {
    // ============================================
    // EVENTS
    // ============================================
    
    /// @notice Emitted when a player deposits ETH
    event Deposited(address indexed player, uint256 amount, uint256 timestamp);
    
    /// @notice Emitted when a new round starts
    event RoundStarted(uint256 indexed roundId, uint256 prizePool, uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when a round ends with results
    event RoundEnded(uint256 indexed roundId, address[] winners, uint256[] shares);
    
    /// @notice Emitted when a winner claims their prize
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    
    /// @notice Emitted when operator withdraws unclaimed funds
    event UnclaimedWithdrawn(uint256 indexed roundId, uint256 amount);

    // ============================================
    // STRUCTS
    // ============================================
    
    struct Round {
        uint256 prizePool;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        bool exists;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /// @notice Get player's total deposited balance
    function getPlayerBalance(address player) external view returns (uint256);
    
    /// @notice Get round details
    function getRound(uint256 roundId) external view returns (Round memory);
    
    /// @notice Get player's claimable prize for a round
    function getClaimableAmount(uint256 roundId, address player) external view returns (uint256);
    
    /// @notice Check if player has claimed prize for a round
    function hasClaimed(uint256 roundId, address player) external view returns (bool);

    // ============================================
    // PLAYER FUNCTIONS
    // ============================================
    
    /// @notice Deposit ETH to get in-game credits
    function deposit() external payable;
    
    /// @notice Claim prize for a completed round
    function claimPrize(uint256 roundId) external;

    // ============================================
    // OPERATOR FUNCTIONS
    // ============================================
    
    /// @notice Start a new game round
    function startRound(uint256 roundId, uint256 duration) external payable;
    
    /// @notice End a round with winners and their shares
    function endRound(uint256 roundId, address[] calldata winners, uint256[] calldata shares) external;
    
    /// @notice Withdraw unclaimed prizes after grace period
    function withdrawUnclaimed(uint256 roundId) external;
}
