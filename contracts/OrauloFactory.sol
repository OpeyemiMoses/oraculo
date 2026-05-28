// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OrauloFactory
 * @notice World Cup AI prediction market on X Layer.
 *         Every agent prediction spawns a market. Users bet WITH or AGAINST
 *         the agent using USDC. Winners get their stake back and split the
 *         losing pool pro-rata based on the amount they staked.
 */
contract OrauloFactory is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────────

    uint256 public constant MIN_AMOUNT = 3e6;      // 3 USDC (6 decimals)
    uint256 public constant MAX_AMOUNT = 5000e6;   // 5000 USDC
    uint256 public constant MIN_DEPOSIT = 3e6;     // 3 USDC minimum deposit
    uint256 public constant FEE_BPS    = 200;      // 2% platform fee
    uint256 public constant BPS        = 10000;

    // ─── Types ───────────────────────────────────────────────────────────────

    enum Side   { With, Against }
    enum Status { Open, Resolved, Cancelled }

    struct Market {
        uint256 id;
        string  question;
        uint8   confidencePct;  // 1–99, agent confidence score
        Status  status;
        bool    agentCorrect;   // set on resolution
        uint256 createdAt;
        uint256 resolveBy;      // unix timestamp deadline
        uint256 poolWith;       // total USDC staked WITH agent
        uint256 poolAgainst;    // total USDC staked AGAINST agent
    }

    struct Bet {
        uint256 marketId;
        Side    side;
        uint256 amount;
        bool    claimed;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    IERC20 public immutable USDC;

    uint256 public marketCount;
    uint256 public accruedFees;

    mapping(uint256 => Market)               public markets;
    mapping(address => Bet[])                public userBets;
    mapping(address => uint256)              public balance;
    mapping(uint256 => address[])            public marketBettors;
    mapping(uint256 => mapping(address => bool)) public hasBet;

    // ─── Events ──────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event MarketCreated(uint256 indexed marketId, string question, uint8 confidencePct, uint256 resolveBy);
    event BetPlaced(uint256 indexed marketId, address indexed user, Side side, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool agentCorrect);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeeWithdrawn(uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _usdc) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
    }

    // ─── Deposit & Withdraw ──────────────────────────────────────────────────

    function deposit(uint256 amount) external nonReentrant {
        require(amount >= MIN_DEPOSIT, "Below minimum deposit of 3 USDC");
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        balance[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(balance[msg.sender] >= amount, "Insufficient balance");
        balance[msg.sender] -= amount;
        USDC.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ─── Market Creation (admin only) ────────────────────────────────────────

    function createMarket(
        string calldata question,
        uint8           confidencePct,
        uint256         resolveBy
    ) external onlyOwner returns (uint256 marketId) {
        require(confidencePct >= 1 && confidencePct <= 99, "Confidence must be 1-99");
        require(resolveBy > block.timestamp, "resolveBy must be in the future");

        marketId = ++marketCount;

        markets[marketId] = Market({
            id:            marketId,
            question:      question,
            confidencePct: confidencePct,
            status:        Status.Open,
            agentCorrect:  false,
            createdAt:     block.timestamp,
            resolveBy:     resolveBy,
            poolWith:      0,
            poolAgainst:   0
        });

        emit MarketCreated(marketId, question, confidencePct, resolveBy);
    }

    // ─── Betting ─────────────────────────────────────────────────────────────

    function placeBet(
        uint256 marketId,
        Side    side,
        uint256 amount
    ) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(m.status == Status.Open, "Market is not open");
        require(block.timestamp < m.resolveBy, "Market has expired");
        require(amount >= MIN_AMOUNT && amount <= MAX_AMOUNT, "Amount must be 3-5000 USDC");
        require(balance[msg.sender] >= amount, "Insufficient balance");

        balance[msg.sender] -= amount;

        if (side == Side.With) {
            m.poolWith += amount;
        } else {
            m.poolAgainst += amount;
        }

        userBets[msg.sender].push(Bet({
            marketId: marketId,
            side:     side,
            amount:   amount,
            claimed:  false
        }));

        if (!hasBet[marketId][msg.sender]) {
            hasBet[marketId][msg.sender] = true;
            marketBettors[marketId].push(msg.sender);
        }

        emit BetPlaced(marketId, msg.sender, side, amount);
    }

    // ─── Resolution (admin only) ─────────────────────────────────────────────

    function resolveMarket(uint256 marketId, bool agentCorrect) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(m.status == Status.Open, "Market is not open");

        m.status       = Status.Resolved;
        m.agentCorrect = agentCorrect;

        emit MarketResolved(marketId, agentCorrect);
    }

    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(m.status == Status.Open, "Market is not open");

        m.status = Status.Cancelled;
        emit MarketCancelled(marketId);
    }

    // ─── Claim Winnings ──────────────────────────────────────────────────────

    function claimWinnings(uint256 betIndex) external nonReentrant {
        require(betIndex < userBets[msg.sender].length, "Invalid bet index");
        Bet storage bet = userBets[msg.sender][betIndex];
        require(!bet.claimed, "Already claimed");

        Market storage m = markets[bet.marketId];

        // Cancelled — full refund
        if (m.status == Status.Cancelled) {
            bet.claimed = true;
            balance[msg.sender] += bet.amount;
            emit WinningsClaimed(bet.marketId, msg.sender, bet.amount);
            return;
        }

        require(m.status == Status.Resolved, "Market not resolved yet");

        bool userWon = (m.agentCorrect  && bet.side == Side.With) ||
                       (!m.agentCorrect && bet.side == Side.Against);
        require(userWon, "Not on the winning side");

        bet.claimed = true;

        uint256 payout = _calculatePayout(bet, m);
        balance[msg.sender] += payout;

        emit WinningsClaimed(bet.marketId, msg.sender, payout);
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _calculatePayout(Bet storage bet, Market storage m) internal returns (uint256) {
        uint256 winnerPool = bet.side == Side.With ? m.poolWith    : m.poolAgainst;
        uint256 loserPool  = bet.side == Side.With ? m.poolAgainst : m.poolWith;

        // No one on the other side — refund stake only
        if (loserPool == 0) {
            return bet.amount;
        }

        // Pro-rata share of loser pool, minus platform fee, plus original stake back
        uint256 grossWinShare = (bet.amount * loserPool) / winnerPool;
        uint256 fee = (grossWinShare * FEE_BPS) / BPS;
        accruedFees += fee;
        return bet.amount + grossWinShare - fee;
    }

    function _quotePayout(uint256 stake, uint256 winnerPool, uint256 loserPool) internal pure returns (uint256) {
        if (stake == 0 || winnerPool == 0) return 0;
        if (loserPool == 0) return stake;

        uint256 grossWinShare = (stake * loserPool) / winnerPool;
        uint256 fee = (grossWinShare * FEE_BPS) / BPS;
        return stake + grossWinShare - fee;
    }

    // ─── Fee Withdrawal (admin) ──────────────────────────────────────────────

    function withdrawFees() external onlyOwner {
        uint256 amount = accruedFees;
        require(amount > 0, "No fees to withdraw");
        accruedFees = 0;
        USDC.safeTransfer(owner(), amount);
        emit FeeWithdrawn(amount);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getUserBets(address user) external view returns (Bet[] memory) {
        return userBets[user];
    }

    function getMarketBettors(uint256 marketId) external view returns (address[] memory) {
        return marketBettors[marketId];
    }

    function getUserBalance(address user) external view returns (uint256) {
        return balance[user];
    }

    function getOdds(uint256 marketId) external view returns (uint256 withOdds, uint256 againstOdds) {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");

        uint256 oneUsdc = 1e6;
        withOdds = _quotePayout(oneUsdc, m.poolWith + oneUsdc, m.poolAgainst);
        againstOdds = _quotePayout(oneUsdc, m.poolAgainst + oneUsdc, m.poolWith);
    }

    function getAllMarkets() external view returns (Market[] memory) {
        Market[] memory all = new Market[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            all[i - 1] = markets[i];
        }
        return all;
    }

}