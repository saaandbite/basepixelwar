// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/GameVault.sol";

contract GameVaultTest is Test {
    GameVault public vault;
    
    address public owner = address(this);
    address public backend = address(0x1);
    address public player1 = address(0x10);
    address public player2 = address(0x20);
    address public player3 = address(0x30);
    address public player4 = address(0x40);
    address public treasury = address(0x100);

    uint256 constant BID_AMOUNT = 0.001 ether;

    function setUp() public {
        vault = new GameVault(backend);
        
        // Fund players
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(player3, 10 ether);
        vm.deal(player4, 10 ether);
    }

    // ============ Game Creation Tests ============

    function test_CreateGame_1vs1() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        assertEq(gameId, 0);
        
        (
            GameVault.GameMode mode,
            GameVault.GameState state,
            uint256 prizePool,
            uint256 playerCount,
            uint256 maxPlayers,
        ) = vault.getGame(gameId);
        
        assertEq(uint(mode), uint(GameVault.GameMode.OneVsOne));
        assertEq(uint(state), uint(GameVault.GameState.Waiting));
        assertEq(prizePool, BID_AMOUNT);
        assertEq(playerCount, 1);
        assertEq(maxPlayers, 2);
    }

    function test_CreateGame_2vs2() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.TwoVsTwo);
        
        (
            GameVault.GameMode mode,
            ,
            ,
            ,
            uint256 maxPlayers,
        ) = vault.getGame(gameId);
        
        assertEq(uint(mode), uint(GameVault.GameMode.TwoVsTwo));
        assertEq(maxPlayers, 4);
    }

    function test_CreateGame_RevertIfIncorrectBid() public {
        vm.prank(player1);
        vm.expectRevert(GameVault.IncorrectBidAmount.selector);
        vault.createGame{value: 0.0005 ether}(GameVault.GameMode.OneVsOne);
    }

    // ============ Join Game Tests ============

    function test_JoinGame_1vs1() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        (,, uint256 prizePool, uint256 playerCount,,) = vault.getGame(gameId);
        
        assertEq(prizePool, BID_AMOUNT * 2);
        assertEq(playerCount, 2);
    }

    function test_JoinGame_RevertIfAlreadyJoined() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player1);
        vm.expectRevert(GameVault.AlreadyJoined.selector);
        vault.joinGame{value: BID_AMOUNT}(gameId);
    }

    function test_JoinGame_RevertIfGameFull() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player3);
        vm.expectRevert(GameVault.GameFull.selector);
        vault.joinGame{value: BID_AMOUNT}(gameId);
    }

    // ============ Start Game Tests ============

    function test_StartGame() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(backend);
        vault.startGame(gameId);
        
        (, GameVault.GameState state,,,,) = vault.getGame(gameId);
        assertEq(uint(state), uint(GameVault.GameState.Active));
    }

    function test_StartGame_RevertIfNotBackend() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player1);
        vm.expectRevert(GameVault.NotBackendSigner.selector);
        vault.startGame(gameId);
    }

    // ============ Finalize 1vs1 Tests ============

    function test_FinalizeGame_1vs1_WinnerTakesAll() public {
        // Setup game
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(backend);
        vault.startGame(gameId);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 totalPool = BID_AMOUNT * 2;
        uint256 treasuryFee = totalPool / 100; // 1%
        uint256 expectedPrize = totalPool - treasuryFee;
        
        // Finalize with player1 as winner
        vm.prank(backend);
        vault.finalizeGame1vs1(gameId, player1);
        
        // Verify winner received prize
        assertEq(player1.balance, player1BalanceBefore + expectedPrize);
        
        // Verify treasury accumulated
        assertEq(vault.treasuryBalance(), treasuryFee);
        
        // Verify game state
        (, GameVault.GameState state,,,,) = vault.getGame(gameId);
        assertEq(uint(state), uint(GameVault.GameState.Completed));
    }

    // ============ Finalize 2vs2 Tests ============

    function test_FinalizeGame_2vs2_ScoreDistribution() public {
        // Setup 2vs2 game
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.TwoVsTwo);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player3);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player4);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(backend);
        vault.startGame(gameId);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        
        uint256 totalPool = BID_AMOUNT * 4;
        uint256 treasuryFee = totalPool / 100; // 1%
        uint256 distributable = totalPool - treasuryFee;
        
        // Player1 scored 70, Player2 scored 30 (team1 wins)
        address[] memory winners = new address[](2);
        winners[0] = player1;
        winners[1] = player2;
        
        uint256[] memory scores = new uint256[](2);
        scores[0] = 70;
        scores[1] = 30;
        
        uint256 expectedPrize1 = (distributable * 70) / 100;
        uint256 expectedPrize2 = distributable - expectedPrize1;
        
        vm.prank(backend);
        vault.finalizeGame2vs2(gameId, winners, scores);
        
        // Verify score-based distribution
        assertEq(player1.balance, player1BalanceBefore + expectedPrize1);
        assertEq(player2.balance, player2BalanceBefore + expectedPrize2);
        
        // Verify treasury
        assertEq(vault.treasuryBalance(), treasuryFee);
    }

    function test_FinalizeGame_2vs2_EqualScores() public {
        // Setup 2vs2 game
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.TwoVsTwo);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player3);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(player4);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(backend);
        vault.startGame(gameId);
        
        uint256 totalPool = BID_AMOUNT * 4;
        uint256 treasuryFee = totalPool / 100;
        uint256 distributable = totalPool - treasuryFee;
        
        address[] memory winners = new address[](2);
        winners[0] = player1;
        winners[1] = player2;
        
        uint256[] memory scores = new uint256[](2);
        scores[0] = 50;
        scores[1] = 50;
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        
        vm.prank(backend);
        vault.finalizeGame2vs2(gameId, winners, scores);
        
        // Equal distribution
        assertEq(player1.balance, player1BalanceBefore + distributable / 2);
        assertEq(player2.balance, player2BalanceBefore + distributable / 2);
    }

    // ============ Cancel Game Tests ============

    function test_CancelGame_RefundAllPlayers() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        
        vm.prank(backend);
        vault.cancelGame(gameId);
        
        // Verify refunds
        assertEq(player1.balance, player1BalanceBefore + BID_AMOUNT);
        assertEq(player2.balance, player2BalanceBefore + BID_AMOUNT);
        
        // Verify game state
        (, GameVault.GameState state,,,,) = vault.getGame(gameId);
        assertEq(uint(state), uint(GameVault.GameState.Cancelled));
    }

    function test_CancelGame_RefundSinglePlayer() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        uint256 player1BalanceBefore = player1.balance;
        
        vm.prank(backend);
        vault.cancelGame(gameId);
        
        assertEq(player1.balance, player1BalanceBefore + BID_AMOUNT);
    }

    // ============ Treasury Tests ============

    function test_WithdrawTreasury() public {
        // Complete a game to accumulate treasury
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        vm.prank(backend);
        vault.startGame(gameId);
        
        vm.prank(backend);
        vault.finalizeGame1vs1(gameId, player1);
        
        uint256 expectedTreasury = (BID_AMOUNT * 2) / 100;
        assertEq(vault.treasuryBalance(), expectedTreasury);
        
        uint256 treasuryBalanceBefore = treasury.balance;
        
        vault.withdrawTreasury(treasury);
        
        assertEq(treasury.balance, treasuryBalanceBefore + expectedTreasury);
        assertEq(vault.treasuryBalance(), 0);
    }

    function test_WithdrawTreasury_RevertIfNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        vault.withdrawTreasury(treasury);
    }

    // ============ Access Control Tests ============

    function test_SetBackendSigner() public {
        address newBackend = address(0x999);
        vault.setBackendSigner(newBackend);
        assertEq(vault.backendSigner(), newBackend);
    }

    function test_SetBackendSigner_RevertIfNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        vault.setBackendSigner(address(0x999));
    }

    // ============ View Function Tests ============

    function test_GetGamePlayers() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        vm.prank(player2);
        vault.joinGame{value: BID_AMOUNT}(gameId);
        
        address[] memory players = vault.getGamePlayers(gameId);
        
        assertEq(players.length, 2);
        assertEq(players[0], player1);
        assertEq(players[1], player2);
    }

    function test_HasPlayerJoined() public {
        vm.prank(player1);
        uint256 gameId = vault.createGame{value: BID_AMOUNT}(GameVault.GameMode.OneVsOne);
        
        assertTrue(vault.hasPlayerJoined(gameId, player1));
        assertFalse(vault.hasPlayerJoined(gameId, player2));
    }

    function test_GetRequiredPlayers() public view {
        assertEq(vault.getRequiredPlayers(GameVault.GameMode.OneVsOne), 2);
        assertEq(vault.getRequiredPlayers(GameVault.GameMode.TwoVsTwo), 4);
    }
}
