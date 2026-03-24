pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ScreenTimeChallenge {
    /// The USDC token contract. Set once at deployment.
    /// Mainnet:  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    /// Base:     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    /// Polygon:  0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
    IERC20 public usdc;

    /// The contract owner. Can update the reporter address.
    address public owner;

    /// The trusted backend wallet that submits daily reports and
    /// declares winners. ONLY address that can call reportOverages()
    /// and settleChallenge().
    address public reporter;

    /// Auto-incrementing ID for each new challenge.
    uint256 public nextChallengeId;

     /// All the configuration and state for a single challenge group.
    struct Challenge {
        // --- Set at creation, never changes ---
        address creator;          // Who created this challenge
        uint256 entryFee;         // Buy-in amount in USDC (goes straight to pot)
        uint256 dailyPenalty;     // Fixed USDC penalty per day over the limit
        uint256 maxParticipants;  // Max players allowed
        uint256 durationDays;     // How many days the challenge lasts
        uint256 startTimestamp;   // Block timestamp when challenge was started

        // --- Mutable state ---
        bool started;             // Has the challenge begun?
        bool settled;             // Has a winner been declared?
        address winner;           // The winner's address (set at settlement)
        uint256 currentDay;       // Which day we're on (0-indexed)
    }

    // challengeId => Challenge struct
    mapping(uint256 => Challenge) public challenges;

    // challengeId => array of participant addresses
    // Stored separately because structs can't contain dynamic arrays
    // in mappings cleanly.
    mapping(uint256 => address[]) public participants;

    // challengeId => user => remaining penalty deposit
    // Starts at (dailyPenalty * durationDays) when they join.
    // Decreases each day they go over the limit.
    mapping(uint256 => mapping(address => uint256)) public depositBalance;

    // challengeId => user => total penalties accumulated (for frontend stats)
    mapping(uint256 => mapping(address => uint256)) public totalPenalties;

    // challengeId => the total prize pot (all buy-ins + all penalties)
    mapping(uint256 => uint256) public prizePot;

    // challengeId => user => whether they've claimed their refund
    mapping(uint256 => mapping(address => bool)) public refundClaimed;


    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        uint256 entryFee,
        uint256 dailyPenalty,
        uint256 durationDays,
        uint256 maxParticipants
    );

    event PlayerJoined(
        uint256 indexed challengeId,
        address indexed player,
        uint256 totalDeposited
    );

    event ChallengeStarted(
        uint256 indexed challengeId,
        uint256 startTimestamp
    );

    event PenaltyCharged(
        uint256 indexed challengeId,
        address indexed player,
        uint256 amount,
        uint256 day
    );

    event ChallengeSettled(
        uint256 indexed challengeId,
        address indexed winner,
        uint256 prizeAmount
    );

    event PrizeClaimed(
        uint256 indexed challengeId,
        address indexed winner,
        uint256 amount
    );

    event RefundClaimed(
        uint256 indexed challengeId,
        address indexed player,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyReporter() {
        require(msg.sender == reporter, "Not reporter");
        _;
    }

    constructor(address _usdcAddress, address _reporter) {
        owner = msg.sender;
        usdc = IERC20(_usdcAddress);
        reporter = _reporter;
    }

    function createChallenge(
        uint256 _entryFee,
        uint256 _dailyPenalty,
        uint256 _durationDays,
        uint256 _maxParticipants
    ) external returns (uint256 challengeId) {
        require(_durationDays > 0, "Duration must be > 0");
        require(_maxParticipants >= 2, "Need at least 2 players");
        require(_dailyPenalty > 0, "Penalty must be > 0");

        challengeId = nextChallengeId;
        nextChallengeId++;

        Challenge storage c = challenges[challengeId];
        c.creator = msg.sender;
        c.entryFee = _entryFee;
        c.dailyPenalty = _dailyPenalty;
        c.durationDays = _durationDays;
        c.maxParticipants = _maxParticipants;

        emit ChallengeCreated(
            challengeId, msg.sender, _entryFee,
            _dailyPenalty, _durationDays, _maxParticipants
        );
    }


    function joinChallenge(uint256 challengeId) external {
        Challenge storage c = challenges[challengeId];

        require(!c.started, "Challenge already started");
        require(!c.settled, "Challenge already settled");
        require(c.durationDays > 0, "Challenge does not exist");

        address[] storage p = participants[challengeId];
        require(p.length < c.maxParticipants, "Challenge is full");

        // depositBalance == 0 means they haven't joined yet
        // (safe because dailyPenalty > 0 and durationDays > 0,
        //  so any joined user will have depositBalance > 0)
        require(depositBalance[challengeId][msg.sender] == 0, "Already joined");

        // --- EFFECTS (update state before external call) ---
        uint256 penaltyDeposit = c.dailyPenalty * c.durationDays;
        uint256 totalDeposit = c.entryFee + penaltyDeposit;

        p.push(msg.sender);
        depositBalance[challengeId][msg.sender] = penaltyDeposit;
        prizePot[challengeId] += c.entryFee;

        // --- INTERACTIONS (external call last — prevents reentrancy) ---
        bool success = usdc.transferFrom(msg.sender, address(this), totalDeposit);
        require(success, "USDC transfer failed");

        emit PlayerJoined(challengeId, msg.sender, totalDeposit);
    }

    function startChallenge(uint256 challengeId) external {
        Challenge storage c = challenges[challengeId];

        require(msg.sender == c.creator, "Only creator can start");
        require(!c.started, "Already started");
        require(participants[challengeId].length >= 2, "Need at least 2 players");

        c.started = true;
        c.startTimestamp = block.timestamp;

        emit ChallengeStarted(challengeId, block.timestamp);
    }

    function reportOverages(
        uint256 challengeId,
        address[] calldata overUsers
    ) external onlyReporter {
        Challenge storage c = challenges[challengeId];

        require(c.started, "Challenge not started");
        require(!c.settled, "Challenge already settled");
        require(c.currentDay < c.durationDays, "Challenge duration complete");

        uint256 day = c.currentDay;

        for (uint256 i = 0; i < overUsers.length; i++) {
            address user = overUsers[i];
            uint256 balance = depositBalance[challengeId][user];

            // Skip users not in this challenge or with zero deposit
            if (balance == 0) continue;

            // Cap penalty at remaining balance (safety check)
            uint256 penalty = c.dailyPenalty;
            if (penalty > balance) {
                penalty = balance;
            }

            // Move from deposit to pot
            depositBalance[challengeId][user] -= penalty;
            totalPenalties[challengeId][user] += penalty;
            prizePot[challengeId] += penalty;

            emit PenaltyCharged(challengeId, user, penalty, day);
        }

        // Advance to next day
        c.currentDay++;
    }

    function settleChallenge(uint256 challengeId, address _winner) external onlyReporter {
        Challenge storage c = challenges[challengeId];

        require(c.started, "Challenge not started");
        require(!c.settled, "Already settled");
        require(c.currentDay >= c.durationDays, "Challenge still in progress");

        // Verify winner is actually a participant
        bool isParticipant = false;
        address[] storage p = participants[challengeId];
        for (uint256 i = 0; i < p.length; i++) {
            if (p[i] == _winner) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Winner is not a participant");

        c.settled = true;
        c.winner = _winner;

        emit ChallengeSettled(challengeId, _winner, prizePot[challengeId]);
    }

    function claimPrize(uint256 challengeId) external {
        Challenge storage c = challenges[challengeId];

        require(c.settled, "Challenge not settled");
        require(msg.sender == c.winner, "Not the winner");

        uint256 prize = prizePot[challengeId];
        require(prize > 0, "Prize already claimed");

        // Zero out BEFORE transferring (prevents reentrancy)
        prizePot[challengeId] = 0;

        bool success = usdc.transfer(msg.sender, prize);
        require(success, "Prize transfer failed");

        emit PrizeClaimed(challengeId, msg.sender, prize);
    }

    function claimRefund(uint256 challengeId) external {
        Challenge storage c = challenges[challengeId];

        require(c.settled, "Challenge not settled");
        require(!refundClaimed[challengeId][msg.sender], "Already claimed");

        uint256 remaining = depositBalance[challengeId][msg.sender];
        require(remaining > 0, "No deposit to refund");

        // Mark claimed and zero balance BEFORE transferring
        refundClaimed[challengeId][msg.sender] = true;
        depositBalance[challengeId][msg.sender] = 0;

        bool success = usdc.transfer(msg.sender, remaining);
        require(success, "Refund transfer failed");

        emit RefundClaimed(challengeId, msg.sender, remaining);
    }

    // Update the reporter if you need to rotate your backend wallet.
    function setReporter(address _newReporter) external onlyOwner {
        require(_newReporter != address(0), "Invalid address");
        reporter = _newReporter;
    }

    /// Transfer contract ownership.
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }


    function getParticipants(uint256 challengeId) external view returns (address[] memory) {
        return participants[challengeId];
    }

    function getParticipantCount(uint256 challengeId) external view returns (uint256) {
        return participants[challengeId].length;
    }

    /// How much USDC a user needs to approve() before joining.
    function getTotalDeposit(uint256 challengeId) external view returns (uint256) {
        Challenge storage c = challenges[challengeId];
        return c.entryFee + (c.dailyPenalty * c.durationDays);
    }

    function isParticipant(uint256 challengeId, address user) external view returns (bool) {
        address[] storage p = participants[challengeId];
        for (uint256 i = 0; i < p.length; i++) {
            if (p[i] == user) return true;
        }
        return false;
    }

    /// Get a player's current state in a challenge.
    function getPlayerStatus(
        uint256 challengeId,
        address user
    ) external view returns (
        uint256 remaining,
        uint256 penalized,
        bool refunded
    ) {
        remaining = depositBalance[challengeId][user];
        penalized = totalPenalties[challengeId][user];
        refunded = refundClaimed[challengeId][user];
    }
}

contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}