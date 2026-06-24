// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ScreenTimeChallenge.sol";

contract ScreenTimeChallengeTest is Test {
    ScreenTimeChallenge challenge;
    MockUSDC usdc;

    address owner = address(this);
    address reporter = makeAddr("reporter");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    uint256 constant ENTRY_FEE = 10e6;      // 10 USDC
    uint256 constant DAILY_PENALTY = 2e6;    // 2 USDC
    uint256 constant DURATION = 3;           // 3 days
    uint256 constant MAX_PLAYERS = 4;

    function setUp() public {
        usdc = new MockUSDC();
        challenge = new ScreenTimeChallenge(address(usdc), reporter);

        // Mint USDC to players
        uint256 needed = ENTRY_FEE + (DAILY_PENALTY * DURATION); // 16 USDC each
        usdc.mint(alice, needed);
        usdc.mint(bob, needed);
        usdc.mint(charlie, needed);

        // Players approve the contract
        vm.prank(alice);
        usdc.approve(address(challenge), needed);
        vm.prank(bob);
        usdc.approve(address(challenge), needed);
        vm.prank(charlie);
        usdc.approve(address(challenge), needed);
    }

    // ========== CREATE ==========

    function test_createChallenge() public {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);
        assertEq(id, 0);

        (address creator, uint256 entryFee, uint256 dailyPenalty, uint256 maxParticipants,
         uint256 durationDays,,,,,) = challenge.challenges(id);

        assertEq(creator, address(this));
        assertEq(entryFee, ENTRY_FEE);
        assertEq(dailyPenalty, DAILY_PENALTY);
        assertEq(maxParticipants, MAX_PLAYERS);
        assertEq(durationDays, DURATION);
    }

    function test_createChallenge_revert_zeroDuration() public {
        vm.expectRevert("Duration must be > 0");
        challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, 0, MAX_PLAYERS);
    }

    function test_createChallenge_revert_lessThan2Players() public {
        vm.expectRevert("Need at least 2 players");
        challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, 1);
    }

    function test_createChallenge_revert_zeroPenalty() public {
        vm.expectRevert("Penalty must be > 0");
        challenge.createChallenge(ENTRY_FEE, 0, DURATION, MAX_PLAYERS);
    }

    // ========== JOIN ==========

    function test_joinChallenge() public {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);

        vm.prank(alice);
        challenge.joinChallenge(id);

        assertEq(challenge.getParticipantCount(id), 1);
        assertEq(challenge.depositBalance(id, alice), DAILY_PENALTY * DURATION);
        assertEq(challenge.prizePot(id), ENTRY_FEE);
        assertEq(usdc.balanceOf(address(challenge)), ENTRY_FEE + (DAILY_PENALTY * DURATION));
    }

    function test_joinChallenge_revert_alreadyJoined() public {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);

        vm.prank(alice);
        challenge.joinChallenge(id);

        vm.prank(alice);
        vm.expectRevert("Already joined");
        challenge.joinChallenge(id);
    }

    function test_joinChallenge_revert_full() public {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, 2);

        vm.prank(alice);
        challenge.joinChallenge(id);
        vm.prank(bob);
        challenge.joinChallenge(id);

        vm.prank(charlie);
        vm.expectRevert("Challenge is full");
        challenge.joinChallenge(id);
    }

    function test_joinChallenge_revert_afterStart() public {
        uint256 id = _createAndJoinTwo();

        vm.prank(address(this));
        challenge.startChallenge(id);

        vm.prank(charlie);
        vm.expectRevert("Challenge already started");
        challenge.joinChallenge(id);
    }

    // ========== START ==========

    function test_startChallenge() public {
        uint256 id = _createAndJoinTwo();

        challenge.startChallenge(id);

        (,,,,, uint256 startTimestamp, bool started,,,) = challenge.challenges(id);
        assertTrue(started);
        assertGt(startTimestamp, 0);
    }

    function test_startChallenge_revert_notCreator() public {
        uint256 id = _createAndJoinTwo();

        vm.prank(alice);
        vm.expectRevert("Only creator can start");
        challenge.startChallenge(id);
    }

    function test_startChallenge_revert_lessThan2() public {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);

        vm.prank(alice);
        challenge.joinChallenge(id);

        vm.expectRevert("Need at least 2 players");
        challenge.startChallenge(id);
    }

    // ========== REPORT OVERAGES ==========

    function test_reportOverages_penalizes() public {
        uint256 id = _createStarted();

        address[] memory overUsers = new address[](1);
        overUsers[0] = alice;

        vm.prank(reporter);
        challenge.reportOverages(id, overUsers);

        assertEq(challenge.depositBalance(id, alice), (DAILY_PENALTY * DURATION) - DAILY_PENALTY);
        assertEq(challenge.totalPenalties(id, alice), DAILY_PENALTY);
        // Prize pot = 2 entry fees + 1 penalty
        assertEq(challenge.prizePot(id), (ENTRY_FEE * 2) + DAILY_PENALTY);

        // Bob not penalized
        assertEq(challenge.depositBalance(id, bob), DAILY_PENALTY * DURATION);
        assertEq(challenge.totalPenalties(id, bob), 0);
    }

    function test_reportOverages_emptyArray() public {
        uint256 id = _createStarted();

        address[] memory overUsers = new address[](0);

        vm.prank(reporter);
        challenge.reportOverages(id, overUsers);

        (,,,,,,,,, uint256 currentDay) = challenge.challenges(id);
        assertEq(currentDay, 1);
    }

    function test_reportOverages_revert_notReporter() public {
        uint256 id = _createStarted();

        address[] memory overUsers = new address[](0);

        vm.prank(alice);
        vm.expectRevert("Not reporter");
        challenge.reportOverages(id, overUsers);
    }

    function test_reportOverages_revert_afterDuration() public {
        uint256 id = _createStarted();

        address[] memory empty = new address[](0);

        // Report all 3 days
        vm.startPrank(reporter);
        challenge.reportOverages(id, empty);
        challenge.reportOverages(id, empty);
        challenge.reportOverages(id, empty);

        vm.expectRevert("Challenge duration complete");
        challenge.reportOverages(id, empty);
        vm.stopPrank();
    }

    // ========== SETTLE ==========

    function test_settleChallenge() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        (,,,,,,,bool settled, address winner,) = challenge.challenges(id);
        assertTrue(settled);
        assertEq(winner, alice);
    }

    function test_settleChallenge_revert_notParticipant() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        vm.expectRevert("Winner is not a participant");
        challenge.settleChallenge(id, makeAddr("nobody"));
    }

    function test_settleChallenge_revert_stillInProgress() public {
        uint256 id = _createStarted();

        vm.prank(reporter);
        vm.expectRevert("Challenge still in progress");
        challenge.settleChallenge(id, alice);
    }

    // ========== CLAIM PRIZE ==========

    function test_claimPrize() public {
        uint256 id = _createAndReportAll();

        // Penalize bob every day
        // (already done in _createAndReportAll — alice penalized all 3 days)

        vm.prank(reporter);
        challenge.settleChallenge(id, bob);

        uint256 pot = challenge.prizePot(id);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        challenge.claimPrize(id);

        assertEq(usdc.balanceOf(bob), bobBefore + pot);
        assertEq(challenge.prizePot(id), 0);
    }

    function test_claimPrize_revert_notWinner() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        vm.prank(bob);
        vm.expectRevert("Not the winner");
        challenge.claimPrize(id);
    }

    function test_claimPrize_revert_doubleClaim() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        vm.startPrank(alice);
        challenge.claimPrize(id);
        vm.expectRevert("Prize already claimed");
        challenge.claimPrize(id);
        vm.stopPrank();
    }

    // ========== CLAIM REFUND ==========

    function test_claimRefund() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        // Bob was never penalized, should get full deposit back
        uint256 bobDeposit = challenge.depositBalance(id, bob);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        challenge.claimRefund(id);

        assertEq(usdc.balanceOf(bob), bobBefore + bobDeposit);
        assertEq(challenge.depositBalance(id, bob), 0);
        assertTrue(challenge.refundClaimed(id, bob));
    }

    function test_claimRefund_revert_doubleClaim() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        vm.startPrank(bob);
        challenge.claimRefund(id);
        vm.expectRevert("Already claimed");
        challenge.claimRefund(id);
        vm.stopPrank();
    }

    function test_claimRefund_revert_noDeposit() public {
        uint256 id = _createAndReportAll();

        vm.prank(reporter);
        challenge.settleChallenge(id, alice);

        // Alice was penalized all 3 days, deposit = 0
        vm.prank(alice);
        vm.expectRevert("No deposit to refund");
        challenge.claimRefund(id);
    }

    // ========== FULL LIFECYCLE ==========

    function test_fullLifecycle() public {
        // Create
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);

        // Join
        vm.prank(alice);
        challenge.joinChallenge(id);
        vm.prank(bob);
        challenge.joinChallenge(id);

        // Start
        challenge.startChallenge(id);

        // Day 0: alice over, bob fine
        address[] memory day0 = new address[](1);
        day0[0] = alice;
        vm.prank(reporter);
        challenge.reportOverages(id, day0);

        // Day 1: both over
        address[] memory day1 = new address[](2);
        day1[0] = alice;
        day1[1] = bob;
        vm.prank(reporter);
        challenge.reportOverages(id, day1);

        // Day 2: nobody over
        address[] memory day2 = new address[](0);
        vm.prank(reporter);
        challenge.reportOverages(id, day2);

        // Settle — bob wins (less total screen time)
        vm.prank(reporter);
        challenge.settleChallenge(id, bob);

        // Expected pot: 2 entry fees + alice 2 penalties + bob 1 penalty
        uint256 expectedPot = (ENTRY_FEE * 2) + (DAILY_PENALTY * 2) + DAILY_PENALTY;
        assertEq(challenge.prizePot(id), expectedPot);

        // Bob claims prize
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        challenge.claimPrize(id);
        assertEq(usdc.balanceOf(bob), bobBefore + expectedPot);

        // Alice has 1 day of deposit left (penalized 2 of 3 days)
        uint256 aliceRemaining = DAILY_PENALTY; // 1 day unpenalized
        vm.prank(alice);
        challenge.claimRefund(id);

        // Bob has 2 days of deposit left (penalized 1 of 3 days)
        uint256 bobRemaining = DAILY_PENALTY * 2;
        vm.prank(bob);
        challenge.claimRefund(id);

        assertEq(usdc.balanceOf(alice), aliceRemaining);
        assertEq(usdc.balanceOf(bob), bobBefore + expectedPot + bobRemaining);
    }

    // ========== ADMIN ==========

    function test_setReporter() public {
        address newReporter = makeAddr("newReporter");
        challenge.setReporter(newReporter);
        assertEq(challenge.reporter(), newReporter);
    }

    function test_setReporter_revert_notOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        challenge.setReporter(alice);
    }

    function test_transferOwnership() public {
        challenge.transferOwnership(alice);
        assertEq(challenge.owner(), alice);
    }

    // ========== HELPERS ==========

    function _createAndJoinTwo() internal returns (uint256) {
        uint256 id = challenge.createChallenge(ENTRY_FEE, DAILY_PENALTY, DURATION, MAX_PLAYERS);
        vm.prank(alice);
        challenge.joinChallenge(id);
        vm.prank(bob);
        challenge.joinChallenge(id);
        return id;
    }

    function _createStarted() internal returns (uint256) {
        uint256 id = _createAndJoinTwo();
        challenge.startChallenge(id);
        return id;
    }

    function _createAndReportAll() internal returns (uint256) {
        uint256 id = _createStarted();

        // Penalize alice every day
        address[] memory overUsers = new address[](1);
        overUsers[0] = alice;

        vm.startPrank(reporter);
        for (uint256 i = 0; i < DURATION; i++) {
            challenge.reportOverages(id, overUsers);
        }
        vm.stopPrank();

        return id;
    }
}
