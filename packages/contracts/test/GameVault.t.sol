// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {GameVault} from "../src/GameVault.sol";
import {IGameVault} from "../src/IGameVault.sol";

contract GameVaultTest is Test {
    GameVault public vault;
    
    address public admin = makeAddr("admin");
    address public operator = makeAddr("operator");
    address public treasury = makeAddr("treasury");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public player3 = makeAddr("player3");
    
    uint256 public constant INITIAL_BALANCE = 10 ether;

    function setUp() public {
        // Deploy vault as admin
        vm.prank(admin);
        vault = new GameVault(treasury);
        
        // Add operator
        vm.prank(admin);
        vault.addOperator(operator);
        
        // Fund test accounts
        vm.deal(player1, INITIAL_BALANCE);
        vm.deal(player2, INITIAL_BALANCE);
        vm.deal(player3, INITIAL_BALANCE);
        vm.deal(operator, INITIAL_BALANCE);
    }

    // ============================================
    // DEPOSIT TESTS
    // ============================================
    
    function test_DepositSuccess() public {
        uint256 depositAmount = 0.1 ether;
        
        vm.prank(player1);
        vault.deposit{value: depositAmount}();
        
        assertEq(vault.getPlayerBalance(player1), depositAmount);
    }
    
    function test_DepositEmitsEvent() public {
        uint256 depositAmount = 0.1 ether;
        
        vm.expectEmit(true, false, false, true);
        emit IGameVault.Deposited(player1, depositAmount, block.timestamp);
        
        vm.prank(player1);
        vault.deposit{value: depositAmount}();
    }
    
    function test_DepositBelowMinimumReverts() public {
        uint256 tooSmall = 0.00001 ether;
        
        vm.prank(player1);
        vm.expectRevert("Below minimum deposit");
        vault.deposit{value: tooSmall}();
    }
    
    function test_MultipleDeposits() public {
        vm.prank(player1);
        vault.deposit{value: 0.1 ether}();
        
        vm.prank(player1);
        vault.deposit{value: 0.2 ether}();
        
        assertEq(vault.getPlayerBalance(player1), 0.3 ether);
    }
    
    function test_ReceiveETHAsDeposit() public {
        uint256 depositAmount = 0.1 ether;
        
        vm.prank(player1);
        (bool success, ) = address(vault).call{value: depositAmount}("");
        
        assertTrue(success);
        assertEq(vault.getPlayerBalance(player1), depositAmount);
    }

    // ============================================
    // ROUND TESTS
    // ============================================
    
    function test_StartRound() public {
        uint256 roundId = 1;
        uint256 duration = 90; // 90 seconds
        uint256 prizePool = 1 ether;
        
        vm.prank(operator);
        vault.startRound{value: prizePool}(roundId, duration);
        
        IGameVault.Round memory round = vault.getRound(roundId);
        
        assertTrue(round.exists);
        assertFalse(round.ended);
        assertEq(round.prizePool, prizePool);
        assertEq(round.endTime, round.startTime + duration);
    }
    
    function test_StartRoundEmitsEvent() public {
        uint256 roundId = 1;
        uint256 duration = 90;
        uint256 prizePool = 1 ether;
        
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit IGameVault.RoundStarted(roundId, prizePool, block.timestamp, block.timestamp + duration);
        
        vault.startRound{value: prizePool}(roundId, duration);
    }
    
    function test_StartRoundNonOperatorReverts() public {
        vm.prank(player1);
        vm.expectRevert();
        vault.startRound{value: 1 ether}(1, 90);
    }
    
    function test_StartDuplicateRoundReverts() public {
        vm.prank(operator);
        vault.startRound{value: 1 ether}(1, 90);
        
        vm.prank(operator);
        vm.expectRevert("Round already exists");
        vault.startRound{value: 1 ether}(1, 90);
    }

    // ============================================
    // END ROUND & PAYOUT TESTS
    // ============================================
    
    function test_EndRoundWithWinners() public {
        uint256 roundId = 1;
        uint256 prizePool = 1 ether;
        
        // Start round
        vm.prank(operator);
        vault.startRound{value: prizePool}(roundId, 90);
        
        // End round with winners (60% to player1, 40% to player2)
        address[] memory winners = new address[](2);
        winners[0] = player1;
        winners[1] = player2;
        
        uint256[] memory shares = new uint256[](2);
        shares[0] = 6000; // 60%
        shares[1] = 4000; // 40%
        
        vm.prank(operator);
        vault.endRound(roundId, winners, shares);
        
        IGameVault.Round memory round = vault.getRound(roundId);
        assertTrue(round.ended);
        
        // Prize pool after 5% fee = 0.95 ether
        // Player1: 0.95 * 0.6 = 0.57 ether
        // Player2: 0.95 * 0.4 = 0.38 ether
        assertEq(vault.getClaimableAmount(roundId, player1), 0.57 ether);
        assertEq(vault.getClaimableAmount(roundId, player2), 0.38 ether);
    }
    
    function test_EndRoundInvalidSharesReverts() public {
        vm.prank(operator);
        vault.startRound{value: 1 ether}(1, 90);
        
        address[] memory winners = new address[](2);
        winners[0] = player1;
        winners[1] = player2;
        
        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000; // 50%
        shares[1] = 4000; // 40% - doesn't equal 100%
        
        vm.prank(operator);
        vm.expectRevert("Shares must equal 100%");
        vault.endRound(1, winners, shares);
    }
    
    function test_ClaimPrize() public {
        uint256 roundId = 1;
        
        // Setup round
        vm.prank(operator);
        vault.startRound{value: 1 ether}(roundId, 90);
        
        address[] memory winners = new address[](1);
        winners[0] = player1;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000; // 100%
        
        vm.prank(operator);
        vault.endRound(roundId, winners, shares);
        
        // Claim prize
        uint256 balanceBefore = player1.balance;
        
        vm.prank(player1);
        vault.claimPrize(roundId);
        
        uint256 balanceAfter = player1.balance;
        
        // 1 ether - 5% fee = 0.95 ether
        assertEq(balanceAfter - balanceBefore, 0.95 ether);
        assertTrue(vault.hasClaimed(roundId, player1));
    }
    
    function test_ClaimPrizeTwiceReverts() public {
        uint256 roundId = 1;
        
        vm.prank(operator);
        vault.startRound{value: 1 ether}(roundId, 90);
        
        address[] memory winners = new address[](1);
        winners[0] = player1;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;
        
        vm.prank(operator);
        vault.endRound(roundId, winners, shares);
        
        vm.prank(player1);
        vault.claimPrize(roundId);
        
        vm.prank(player1);
        vm.expectRevert("Already claimed");
        vault.claimPrize(roundId);
    }

    // ============================================
    // ADMIN TESTS
    // ============================================
    
    function test_WithdrawFees() public {
        // Create and end a round to generate fees
        vm.prank(operator);
        vault.startRound{value: 1 ether}(1, 90);
        
        address[] memory winners = new address[](1);
        winners[0] = player1;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;
        
        vm.prank(operator);
        vault.endRound(1, winners, shares);
        
        // Check platform fees
        assertEq(vault.platformFees(), 0.05 ether);
        
        // Withdraw fees
        uint256 treasuryBefore = treasury.balance;
        
        vm.prank(admin);
        vault.withdrawFees();
        
        assertEq(treasury.balance - treasuryBefore, 0.05 ether);
        assertEq(vault.platformFees(), 0);
    }
    
    function test_PauseUnpause() public {
        vm.prank(admin);
        vault.pause();
        
        vm.prank(player1);
        vm.expectRevert();
        vault.deposit{value: 0.1 ether}();
        
        vm.prank(admin);
        vault.unpause();
        
        vm.prank(player1);
        vault.deposit{value: 0.1 ether}();
        
        assertEq(vault.getPlayerBalance(player1), 0.1 ether);
    }
    
    function test_EmergencyWithdraw() public {
        // Deposit some ETH
        vm.prank(player1);
        vault.deposit{value: 1 ether}();
        
        // Pause contract
        vm.prank(admin);
        vault.pause();
        
        // Emergency withdraw
        uint256 treasuryBefore = treasury.balance;
        
        vm.prank(admin);
        vault.emergencyWithdraw();
        
        assertEq(address(vault).balance, 0);
        assertEq(treasury.balance - treasuryBefore, 1 ether);
    }
    
    function test_EmergencyWithdrawNotPausedReverts() public {
        vm.prank(player1);
        vault.deposit{value: 1 ether}();
        
        vm.prank(admin);
        vm.expectRevert();
        vault.emergencyWithdraw();
    }

    // ============================================
    // FUZZ TESTS
    // ============================================
    
    function testFuzz_Deposit(uint256 amount) public {
        amount = bound(amount, vault.MIN_DEPOSIT(), 100 ether);
        vm.deal(player1, amount);
        
        vm.prank(player1);
        vault.deposit{value: amount}();
        
        assertEq(vault.getPlayerBalance(player1), amount);
    }
}
