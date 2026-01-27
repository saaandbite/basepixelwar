// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./PixelTrophy.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TournamentMCL is ReentrancyGuard, Ownable {
    PixelTrophy public trophyContract;
    address public gameVault;

    uint256 public constant PLAYERS_PER_ROOM = 10;
    uint256 public currentWeek = 1;
    uint256 public totalPlayersThisWeek = 0;

    struct PlayerStats {
        uint256 score;
        uint256 roomId;
        bool hasClaimed;
    }

    struct Room {
        address[] players;
        uint256 prizePool;
    }

    // --- STRUCT KHUSUS UNTUK MENGATASI ERROR STACK ---
    // Dengan membungkus variabel ini, kita menghemat 5 slot stack
    struct TopScorers {
        address w1; uint256 s1;
        address w2; uint256 s2;
        address w3; uint256 s3;
    }

    mapping(uint256 => mapping(address => PlayerStats)) public playerInfo;
    mapping(uint256 => mapping(uint256 => Room)) public rooms;

    constructor(address _trophyAddress) Ownable(msg.sender) {
        trophyContract = PixelTrophy(_trophyAddress);
    }

    // =================================================
    // ADMIN
    // =================================================

    function setGameVault(address _gameVault) external onlyOwner {
        gameVault = _gameVault;
    }

    function setTrophyContract(address _trophy) external onlyOwner {
        trophyContract = PixelTrophy(_trophy);
    }

    function startNewWeek() external onlyOwner {
        currentWeek++;
        totalPlayersThisWeek = 0;
    }

    /**
     * Batch update player scores when tournament ends
     * Can only be called by owner (backend)
     * @param players Array of player addresses
     * @param scores Array of score values to SET (not add)
     */
    function setPlayerScoreBatch(address[] calldata players, uint256[] calldata scores) external onlyOwner {
        require(players.length == scores.length, "Array length mismatch");
        require(players.length <= 100, "Max 100 players per batch");
        
        for (uint256 i = 0; i < players.length; i++) {
            PlayerStats storage stats = playerInfo[currentWeek][players[i]];
            if (stats.roomId != 0) {
                stats.score = scores[i];
            }
        }
    }

    // =================================================
    // JOIN
    // =================================================

    function joinTournament() external payable {
        require(msg.value >= 0.001 ether, "Tiket kurang");
        require(playerInfo[currentWeek][msg.sender].roomId == 0, "Sudah join");

        totalPlayersThisWeek++;
        uint256 roomId = ((totalPlayersThisWeek - 1) / PLAYERS_PER_ROOM) + 1;

        PlayerStats storage stats = playerInfo[currentWeek][msg.sender];
        stats.roomId = roomId;

        rooms[currentWeek][roomId].players.push(msg.sender);
        rooms[currentWeek][roomId].prizePool += msg.value;
    }

    // =================================================
    // SCORING
    // =================================================

    function addScore(address player) external {
        require(msg.sender == gameVault, "Hanya GameVault");

        PlayerStats storage stats = playerInfo[currentWeek][player];
        if (stats.roomId != 0) {
            stats.score += 10;
        }
    }

    // =================================================
    // CLAIM (OPTIMIZED)
    // =================================================

    function claimReward(uint256 weekNumber) external nonReentrant {
        _validateClaim(weekNumber);

        // Ambil roomId ke variabel memory
        uint256 roomId = playerInfo[weekNumber][msg.sender].roomId;
        
        // Update state SEBELUM transfer/mint (Best Practice)
        playerInfo[weekNumber][msg.sender].hasClaimed = true;

        _handleReward(weekNumber, roomId, msg.sender);
    }

    function _validateClaim(uint256 weekNumber) internal view {
        require(weekNumber < currentWeek, "Minggu belum selesai");
        PlayerStats storage stats = playerInfo[weekNumber][msg.sender];
        require(stats.roomId != 0, "Gak ikut main");
        require(!stats.hasClaimed, "Sudah klaim");
    }

    function _handleReward(
        uint256 week,
        uint256 roomId,
        address player
    ) internal {
        // Panggil fungsi Top 3 yang sudah diperbaiki
        (address w1, address w2, address w3) = _getTop3(week, roomId);
        
        uint256 pool = rooms[week][roomId].prizePool;

        if (player == w1) {
            trophyContract.mintTrophy(player, week, roomId);
        } else if (player == w2) {
            _pay(player, (pool * 60) / 100);
        } else if (player == w3) {
            _pay(player, (pool * 40) / 100);
        } else {
            revert("Bukan Top 3");
        }
    }

    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "TF Gagal");
    }

    // =================================================
    // TOP 3 CALCULATION (FIXED STACK ERROR)
    // =================================================

    function _getTop3(
        uint256 week,
        uint256 roomId
    ) internal view returns (address, address, address) {
        address[] storage players = rooms[week][roomId].players;
        
        // INI PERUBAHAN UTAMANYA:
        // Kita menggunakan struct 'top' di memory.
        // Compiler hanya perlu menyimpan 1 pointer di stack, bukan 6 variabel.
        TopScorers memory top; 

        for (uint256 i = 0; i < players.length; i++) {
            address p = players[i];
            uint256 s = playerInfo[week][p].score;

            if (s > top.s1) {
                // Geser juara 2 ke 3
                top.s3 = top.s2; top.w3 = top.w2;
                // Geser juara 1 ke 2
                top.s2 = top.s1; top.w2 = top.w1;
                // Juara 1 Baru
                top.s1 = s;      top.w1 = p;
            } else if (s > top.s2) {
                // Geser juara 2 ke 3
                top.s3 = top.s2; top.w3 = top.w2;
                // Juara 2 Baru
                top.s2 = s;      top.w2 = p;
            } else if (s > top.s3) {
                // Juara 3 Baru
                top.s3 = s;      top.w3 = p;
            }
        }

        return (top.w1, top.w2, top.w3);
    }
}