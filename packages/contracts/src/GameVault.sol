// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GameVault
 * @notice Smart contract for game bidding with 1vs1 and 2vs2 modes
 * @dev Backend server determines winners and triggers prize distribution
 */
contract GameVault is Ownable, ReentrancyGuard {
    // ============ Constants ============
    uint256 public constant BID_AMOUNT = 0.001 ether;
    uint256 public constant TREASURY_FEE_BPS = 100; // 1% = 100 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ============ Enums ============
    enum GameMode { OneVsOne, TwoVsTwo }
    enum GameState { Waiting, Active, Completed, Cancelled }

    // ============ Structs ============
    struct Player {
        address playerAddress;
        bool hasBid;
    }

    struct Game {
        uint256 gameId;
        GameMode mode;
        GameState state;
        uint256 prizePool;
        uint256 playerCount;
        uint256 maxPlayers;
        uint256 createdAt;
    }

    // ============ State Variables ============
    uint256 public nextGameId;
    uint256 public treasuryBalance;
    address public backendSigner;

    // gameId => Game
    mapping(uint256 => Game) public games;
    // gameId => player index => Player
    mapping(uint256 => mapping(uint256 => Player)) public gamePlayers;
    // gameId => player address => has joined
    mapping(uint256 => mapping(address => bool)) public hasJoinedGame;

    // ============ Events ============
    event GameCreated(uint256 indexed gameId, GameMode mode, address creator);
    event PlayerJoined(uint256 indexed gameId, address player, uint256 playerCount);
    event GameStarted(uint256 indexed gameId);
    event GameCompleted(uint256 indexed gameId, address[] winners, uint256[] prizes);
    event GameCancelled(uint256 indexed gameId);
    event PlayerRefunded(uint256 indexed gameId, address player, uint256 amount);
    event TreasuryWithdrawn(address to, uint256 amount);
    event BackendSignerUpdated(address oldSigner, address newSigner);

    // ============ Errors ============
    error InvalidGameMode();
    error GameNotFound();
    error GameNotWaiting();
    error GameNotActive();
    error GameFull();
    error AlreadyJoined();
    error IncorrectBidAmount();
    error NotBackendSigner();
    error NoPlayersToRefund();
    error InvalidWinnerCount();
    error InvalidScoreCount();
    error TransferFailed();
    error ZeroAddress();
    error NoTreasuryBalance();

    // ============ Modifiers ============
    modifier onlyBackend() {
        if (msg.sender != backendSigner) revert NotBackendSigner();
        _;
    }

    // ============ Constructor ============
    constructor(address _backendSigner) Ownable(msg.sender) {
        if (_backendSigner == address(0)) revert ZeroAddress();
        backendSigner = _backendSigner;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new game and join as first player
     * @param mode Game mode (0 = 1vs1, 1 = 2vs2)
     * @return gameId The ID of the created game
     */
    function createGame(GameMode mode) external payable nonReentrant returns (uint256) {
        if (msg.value != BID_AMOUNT) revert IncorrectBidAmount();

        uint256 gameId = nextGameId++;
        uint256 maxPlayers = mode == GameMode.OneVsOne ? 2 : 4;

        games[gameId] = Game({
            gameId: gameId,
            mode: mode,
            state: GameState.Waiting,
            prizePool: msg.value,
            playerCount: 1,
            maxPlayers: maxPlayers,
            createdAt: block.timestamp
        });

        gamePlayers[gameId][0] = Player({
            playerAddress: msg.sender,
            hasBid: true
        });
        hasJoinedGame[gameId][msg.sender] = true;

        emit GameCreated(gameId, mode, msg.sender);
        emit PlayerJoined(gameId, msg.sender, 1);

        return gameId;
    }

    /**
     * @notice Join an existing game
     * @param gameId The ID of the game to join
     */
    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage game = games[gameId];
        
        if (game.createdAt == 0) revert GameNotFound();
        if (game.state != GameState.Waiting) revert GameNotWaiting();
        if (game.playerCount >= game.maxPlayers) revert GameFull();
        if (hasJoinedGame[gameId][msg.sender]) revert AlreadyJoined();
        if (msg.value != BID_AMOUNT) revert IncorrectBidAmount();

        uint256 playerIndex = game.playerCount;
        gamePlayers[gameId][playerIndex] = Player({
            playerAddress: msg.sender,
            hasBid: true
        });
        hasJoinedGame[gameId][msg.sender] = true;
        
        game.playerCount++;
        game.prizePool += msg.value;

        emit PlayerJoined(gameId, msg.sender, game.playerCount);
    }

    /**
     * @notice Start a game (called by backend when all players joined)
     * @param gameId The ID of the game to start
     */
    function startGame(uint256 gameId) external onlyBackend {
        Game storage game = games[gameId];
        
        if (game.createdAt == 0) revert GameNotFound();
        if (game.state != GameState.Waiting) revert GameNotWaiting();
        if (game.playerCount != game.maxPlayers) revert GameNotWaiting();

        game.state = GameState.Active;
        emit GameStarted(gameId);
    }

    /**
     * @notice Finalize a 1vs1 game - winner takes all (minus treasury fee)
     * @param gameId The ID of the game
     * @param winner Address of the winner
     */
    function finalizeGame1vs1(uint256 gameId, address winner) external onlyBackend nonReentrant {
        Game storage game = games[gameId];
        
        if (game.createdAt == 0) revert GameNotFound();
        if (game.state != GameState.Active) revert GameNotActive();
        if (game.mode != GameMode.OneVsOne) revert InvalidGameMode();

        // Calculate treasury fee and prize
        uint256 treasuryFee = (game.prizePool * TREASURY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prize = game.prizePool - treasuryFee;

        // Update state
        game.state = GameState.Completed;
        treasuryBalance += treasuryFee;

        // Transfer prize to winner
        (bool success, ) = winner.call{value: prize}("");
        if (!success) revert TransferFailed();

        address[] memory winners = new address[](1);
        winners[0] = winner;
        uint256[] memory prizes = new uint256[](1);
        prizes[0] = prize;

        emit GameCompleted(gameId, winners, prizes);
    }

    /**
     * @notice Finalize a 2vs2 game with score-based distribution
     * @param gameId The ID of the game
     * @param winners Array of winning team player addresses (2 players)
     * @param scores Array of scores corresponding to each winner
     */
    function finalizeGame2vs2(
        uint256 gameId, 
        address[] calldata winners, 
        uint256[] calldata scores
    ) external onlyBackend nonReentrant {
        Game storage game = games[gameId];
        
        if (game.createdAt == 0) revert GameNotFound();
        if (game.state != GameState.Active) revert GameNotActive();
        if (game.mode != GameMode.TwoVsTwo) revert InvalidGameMode();
        if (winners.length != 2) revert InvalidWinnerCount();
        if (scores.length != 2) revert InvalidScoreCount();

        // Calculate treasury fee and distributable prize
        uint256 treasuryFee = (game.prizePool * TREASURY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 distributablePrize = game.prizePool - treasuryFee;

        // Calculate score-based distribution
        uint256 totalScore = scores[0] + scores[1];
        uint256[] memory prizes = new uint256[](2);
        
        if (totalScore == 0) {
            // If both scores are 0, split equally
            prizes[0] = distributablePrize / 2;
            prizes[1] = distributablePrize - prizes[0];
        } else {
            // Distribute based on score ratio
            prizes[0] = (distributablePrize * scores[0]) / totalScore;
            prizes[1] = distributablePrize - prizes[0]; // Remaining to second player to avoid rounding issues
        }

        // Update state
        game.state = GameState.Completed;
        treasuryBalance += treasuryFee;

        // Transfer prizes to winners
        for (uint256 i = 0; i < 2; i++) {
            if (prizes[i] > 0) {
                (bool success, ) = winners[i].call{value: prizes[i]}("");
                if (!success) revert TransferFailed();
            }
        }

        emit GameCompleted(gameId, winners, prizes);
    }

    /**
     * @notice Cancel a game and refund all players
     * @param gameId The ID of the game to cancel
     */
    function cancelGame(uint256 gameId) external onlyBackend nonReentrant {
        Game storage game = games[gameId];
        
        if (game.createdAt == 0) revert GameNotFound();
        if (game.state == GameState.Completed || game.state == GameState.Cancelled) {
            revert GameNotWaiting();
        }
        if (game.playerCount == 0) revert NoPlayersToRefund();

        game.state = GameState.Cancelled;

        // Refund all players
        for (uint256 i = 0; i < game.playerCount; i++) {
            Player storage player = gamePlayers[gameId][i];
            if (player.hasBid) {
                player.hasBid = false;
                (bool success, ) = player.playerAddress.call{value: BID_AMOUNT}("");
                if (!success) revert TransferFailed();
                emit PlayerRefunded(gameId, player.playerAddress, BID_AMOUNT);
            }
        }

        emit GameCancelled(gameId);
    }

    /**
     * @notice Withdraw accumulated treasury fees
     * @param to Address to receive the fees
     */
    function withdrawTreasury(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (treasuryBalance == 0) revert NoTreasuryBalance();

        uint256 amount = treasuryBalance;
        treasuryBalance = 0;

        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit TreasuryWithdrawn(to, amount);
    }

    /**
     * @notice Update the backend signer address
     * @param newSigner New backend signer address
     */
    function setBackendSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = backendSigner;
        backendSigner = newSigner;
        emit BackendSignerUpdated(oldSigner, newSigner);
    }

    // ============ View Functions ============

    /**
     * @notice Get game details
     * @param gameId The ID of the game
     */
    function getGame(uint256 gameId) external view returns (
        GameMode mode,
        GameState state,
        uint256 prizePool,
        uint256 playerCount,
        uint256 maxPlayers,
        uint256 createdAt
    ) {
        Game storage game = games[gameId];
        return (
            game.mode,
            game.state,
            game.prizePool,
            game.playerCount,
            game.maxPlayers,
            game.createdAt
        );
    }

    /**
     * @notice Get all players in a game
     * @param gameId The ID of the game
     */
    function getGamePlayers(uint256 gameId) external view returns (address[] memory) {
        Game storage game = games[gameId];
        address[] memory players = new address[](game.playerCount);
        
        for (uint256 i = 0; i < game.playerCount; i++) {
            players[i] = gamePlayers[gameId][i].playerAddress;
        }
        
        return players;
    }

    /**
     * @notice Check if a player has joined a specific game
     * @param gameId The ID of the game
     * @param player The player address
     */
    function hasPlayerJoined(uint256 gameId, address player) external view returns (bool) {
        return hasJoinedGame[gameId][player];
    }

    /**
     * @notice Get the required number of players for a game mode
     * @param mode The game mode
     */
    function getRequiredPlayers(GameMode mode) external pure returns (uint256) {
        return mode == GameMode.OneVsOne ? 2 : 4;
    }
}
