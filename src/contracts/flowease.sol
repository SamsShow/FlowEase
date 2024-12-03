// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FlowEasePaymentSystem is Ownable, ReentrancyGuard {
    // Optimized enums (uint8 by default)
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

    // Optimized struct packing
    struct Milestone {
        uint256 id;
        address freelancer;
        address client;
        address tokenAddress;
        uint256 amount;
        uint256 platformFee;
        string description;
        MilestoneStatus status;
        uint40 createdAt;      // Reduced timestamp size
        uint40 deadline;       // Reduced timestamp size
    }

    struct Dispute {
        uint256 milestoneId;
        address disputedBy;
        string reason;
        uint40 createdAt;
        DisputeOutcome outcome;
        uint40 votingDeadline;
        uint128 votesForFreelancer;
        uint128 votesForClient;
        mapping(address => bool) hasVoted;
    }

    struct UserProfile {
        string ipfsHash;
        string profileImage;
        uint128 totalJobs;
        uint128 completedJobs;
        uint16 averageRating;    // Stored as number * 100
        bool isVerified;
        uint32 reviewCount;
        mapping(uint256 => Review) reviews;
    }

    struct Review {
        address reviewer;
        uint8 rating;           // 1-5 stars
        string comment;
        uint40 timestamp;
        uint256 milestoneId;
    }

    // State Variables
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public userReputation;
    mapping(address => bool) public allowedTokens;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => bool) public verifiedUsers;
    mapping(uint256 => mapping(address => bool)) public milestoneReviewed;

    uint256 public milestoneCounter;
    uint256 public disputeCounter;
    address public immutable platformWallet;

    // Events (keep existing events)
    event MilestoneCreated(uint256 indexed milestoneId, address indexed freelancer, address indexed client, uint256 amount);
    event MilestoneStatusChanged(uint256 indexed milestoneId, MilestoneStatus newStatus);
    event DisputeRaised(uint256 indexed disputeId, uint256 indexed milestoneId, address disputedBy);
    event DisputeResolved(uint256 indexed disputeId, DisputeOutcome outcome);
    event ProfileUpdated(address indexed user, string ipfsHash);
    event ReviewAdded(address indexed reviewer, address indexed reviewed, uint256 rating, uint256 milestoneId);
    event UserVerified(address indexed user);

    // Custom errors
    error InsufficientFunds();
    error InvalidMilestoneStatus();
    error UnauthorizedAccess();
    error DisputeAlreadyResolved();
    error TokenNotSupported();
    error InvalidDeadline();
    error InvalidAmount();

    constructor() Ownable(msg.sender) {
        platformWallet = msg.sender;
        allowedTokens[address(0)] = true; // Enable ETH by default
    }

    // Optimized utility function
    function calculatePlatformFee(uint256 amount) internal pure returns (uint256) {
        return amount * 1 / 100; // 1% platform fee
    }

    // Optimized milestone creation
    function createMilestone(
        address _freelancer,
        address _tokenAddress,
        uint256 _amount,
        string calldata _description,
        uint256 _deadline
    ) external payable nonReentrant {
        if (_amount == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        if (!allowedTokens[_tokenAddress]) revert TokenNotSupported();

            uint256 platformFee = calculatePlatformFee(_amount);
            uint256 totalAmount = _amount + platformFee;

        if (_tokenAddress != address(0)) {
            IERC20 token = IERC20(_tokenAddress);
            bool success = token.transferFrom(msg.sender, address(this), totalAmount);
            if (!success) revert InsufficientFunds();
        } else {
            if (msg.value != totalAmount) revert InsufficientFunds();
        }

        uint256 milestoneId = ++milestoneCounter;
        
        milestones[milestoneId] = Milestone({
            id: milestoneId,
            freelancer: _freelancer,
            client: msg.sender,
            tokenAddress: _tokenAddress,
            amount: _amount,
            platformFee: platformFee,
            description: _description,
            status: MilestoneStatus.PENDING,
            createdAt: uint40(block.timestamp),
            deadline: uint40(_deadline)
        });

        userProfiles[_freelancer].totalJobs++;

        emit MilestoneCreated(milestoneId, _freelancer, msg.sender, _amount);
    }

    // Continue with other functions...
    // I'll provide the rest of the optimized functions in the next message
    // to keep this response focused and clear.
}