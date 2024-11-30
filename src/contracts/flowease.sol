// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FlowEasePaymentSystem is Ownable, ReentrancyGuard {
    // Utility Functions (Inline Library)
    function calculatePlatformFee(uint256 amount) internal pure returns (uint256) {
        // 1% platform fee
        return amount * 1 / 100;
    }

    // Enums and Structures
    enum MilestoneStatus { 
        PENDING, 
        IN_PROGRESS, 
        SUBMITTED, 
        APPROVED, 
        DISPUTED, 
        REJECTED 
    }

    enum DisputeOutcome {
        PENDING,
        RESOLVED_FOR_FREELANCER,
        RESOLVED_FOR_CLIENT
    }

    struct Milestone {
        uint256 id;
        address freelancer;
        address client;
        address tokenAddress;
        uint256 amount;
        uint256 platformFee;
        string description;
        MilestoneStatus status;
        uint256 createdAt;
        uint256 deadline;
    }

    struct Dispute {
        uint256 milestoneId;
        address disputedBy;
        string reason;
        uint256 createdAt;
        DisputeOutcome outcome;
        uint256 votingDeadline;
        mapping(address => bool) hasVoted;
        uint256 votesForFreelancer;
        uint256 votesForClient;
    }

    // State Variables
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public userReputation;
    mapping(address => bool) public allowedTokens;

    uint256 public milestoneCounter;
    uint256 public disputeCounter;
    address public platformWallet;

    // Custom Errors
    error InsufficientFunds();
    error InvalidMilestoneStatus();
    error UnauthorizedAccess();
    error DisputeAlreadyResolved();
    error TokenNotSupported();

    // Events
    event MilestoneCreated(
        uint256 indexed milestoneId, 
        address indexed freelancer, 
        address indexed client, 
        uint256 amount
    );

    event MilestoneStatusChanged(
        uint256 indexed milestoneId, 
        MilestoneStatus newStatus
    );

    event DisputeRaised(
        uint256 indexed disputeId, 
        uint256 indexed milestoneId, 
        address disputedBy
    );

    event DisputeResolved(
        uint256 indexed disputeId, 
        DisputeOutcome outcome
    );

    // Constructor
    constructor() Ownable(msg.sender) {
        platformWallet = msg.sender;
    }

    // Token Whitelist Management
    function whitelistToken(address _token, bool _status) external onlyOwner {
        allowedTokens[_token] = _status;
    }

    // Milestone Creation
    function createMilestone(
        address _freelancer, 
        address _tokenAddress, 
        uint256 _amount, 
        string memory _description,
        uint256 _deadline
    ) external nonReentrant {
        // Validate token is allowed
        if (!allowedTokens[_tokenAddress]) 
            revert TokenNotSupported();

        // Calculate platform fee
        uint256 platformFee = calculatePlatformFee(_amount);
        
        // Transfer tokens to contract
        IERC20 token = IERC20(_tokenAddress);
        require(
            token.transferFrom(msg.sender, address(this), _amount), 
            "Token transfer failed"
        );

        // Increment milestone counter
        milestoneCounter++;
        
        // Create milestone
        milestones[milestoneCounter] = Milestone({
            id: milestoneCounter,
            freelancer: _freelancer,
            client: msg.sender,
            tokenAddress: _tokenAddress,
            amount: _amount - platformFee,
            platformFee: platformFee,
            description: _description,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            deadline: _deadline
        });

        // Emit milestone creation event
        emit MilestoneCreated(milestoneCounter, _freelancer, msg.sender, _amount);
    }

    // Freelancer Submits Milestone
    function submitMilestone(uint256 _milestoneId) external {
        Milestone storage milestone = milestones[_milestoneId];
        
        // Validate access and status
        if (msg.sender != milestone.freelancer) 
            revert UnauthorizedAccess();
        
        if (milestone.status != MilestoneStatus.PENDING) 
            revert InvalidMilestoneStatus();

        // Update milestone status
        milestone.status = MilestoneStatus.SUBMITTED;
        emit MilestoneStatusChanged(_milestoneId, MilestoneStatus.SUBMITTED);
    }

    // Client Approves Milestone
    function approveMilestone(uint256 _milestoneId) external nonReentrant {
        Milestone storage milestone = milestones[_milestoneId];
        
        // Validate access and status
        if (msg.sender != milestone.client) 
            revert UnauthorizedAccess();
        
        if (milestone.status != MilestoneStatus.SUBMITTED) 
            revert InvalidMilestoneStatus();

        IERC20 token = IERC20(milestone.tokenAddress);
        
        // Transfer funds to freelancer
        require(
            token.transfer(milestone.freelancer, milestone.amount), 
            "Freelancer payment failed"
        );

        // Transfer platform fee
        require(
            token.transfer(platformWallet, milestone.platformFee), 
            "Platform fee transfer failed"
        );

        // Update milestone status and reputation
        milestone.status = MilestoneStatus.APPROVED;
        userReputation[milestone.freelancer] += 10;

        emit MilestoneStatusChanged(_milestoneId, MilestoneStatus.APPROVED);
    }

    // Raise Dispute
    function raiseMilestoneDispute(
        uint256 _milestoneId, 
        string memory _reason
    ) external {
        Milestone storage milestone = milestones[_milestoneId];
        
        // Validate access
        if (
            msg.sender != milestone.client && 
            msg.sender != milestone.freelancer
        ) revert UnauthorizedAccess();

        // Increment dispute counter
        disputeCounter++;
        
        // Create dispute
        Dispute storage dispute = disputes[disputeCounter];
        dispute.milestoneId = _milestoneId;
        dispute.disputedBy = msg.sender;
        dispute.reason = _reason;
        dispute.createdAt = block.timestamp;
        dispute.votingDeadline = block.timestamp + 7 days;
        dispute.outcome = DisputeOutcome.PENDING;

        // Update milestone status
        milestone.status = MilestoneStatus.DISPUTED;

        emit DisputeRaised(disputeCounter, _milestoneId, msg.sender);
    }

    // Community Dispute Resolution
    function voteOnDispute(
        uint256 _disputeId, 
        bool _voteForFreelancer
    ) external {
        Dispute storage dispute = disputes[_disputeId];
        
        // Validate voting period and prevent multiple votes
        if (block.timestamp > dispute.votingDeadline) 
            revert DisputeAlreadyResolved();
        
        if (dispute.hasVoted[msg.sender]) 
            revert UnauthorizedAccess();

        // Record vote
        dispute.hasVoted[msg.sender] = true;

        if (_voteForFreelancer) {
            dispute.votesForFreelancer++;
        } else {
            dispute.votesForClient++;
        }
    }

    // Finalize Dispute
    function resolveDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        Milestone storage milestone = milestones[dispute.milestoneId];

        // Validate voting period has ended
        if (block.timestamp < dispute.votingDeadline) 
            revert UnauthorizedAccess();

        IERC20 token = IERC20(milestone.tokenAddress);

        if (dispute.votesForFreelancer > dispute.votesForClient) {
            // Resolve in favor of freelancer
            require(
                token.transfer(milestone.freelancer, milestone.amount), 
                "Freelancer payment failed"
            );
            dispute.outcome = DisputeOutcome.RESOLVED_FOR_FREELANCER;
            milestone.status = MilestoneStatus.APPROVED;
        } else {
            // Resolve in favor of client
            require(
                token.transfer(milestone.client, milestone.amount), 
                "Client refund failed"
            );
            dispute.outcome = DisputeOutcome.RESOLVED_FOR_CLIENT;
            milestone.status = MilestoneStatus.REJECTED;
        }

        emit DisputeResolved(_disputeId, dispute.outcome);
    }

    // Withdraw Stale Funds
    function withdrawStaleFunds(
        address _token, 
        uint256 _milestoneId
    ) external onlyOwner {
        Milestone storage milestone = milestones[_milestoneId];
        
        // Ensure enough time has passed
        if (block.timestamp < milestone.deadline + 30 days) 
            revert UnauthorizedAccess();

        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));

        require(
            token.transfer(platformWallet, balance), 
            "Stale funds withdrawal failed"
        );
    }

    // Fallback Functions
    receive() external payable {}
    fallback() external payable {}
}