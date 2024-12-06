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
        uint256 amount;
        string description;
        MilestoneStatus status;
        uint256 createdAt;
        uint256 deadline;
        string deliverablesHash;
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

    // Additional structures for new features
    struct UserProfile {
        string ipfsHash;           // IPFS hash containing profile data (name, bio, etc.)
        string profileImage;       // IPFS hash of profile image
        uint256 totalJobs;
        uint256 completedJobs;
        uint256 averageRating;     // Stored as number * 100 (e.g., 4.5 = 450)
        bool isVerified;
        mapping(uint256 => Review) reviews;
        uint256 reviewCount;
    }

    struct Review {
        address reviewer;
        uint256 rating;           // 1-5 stars
        string comment;
        uint256 timestamp;
        uint256 milestoneId;      // Associated milestone
    }

    // State Variables
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public userReputation;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => bool) public verifiedUsers;
    mapping(uint256 => mapping(address => bool)) public milestoneReviewed;

    uint256 public milestoneCounter;
    uint256 public disputeCounter;
    address public platformWallet;

    // Custom Errors
    error InsufficientFunds();
    error InvalidMilestoneStatus();
    error UnauthorizedAccess();
    error DisputeAlreadyResolved();

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

    event ProfileUpdated(address indexed user, string ipfsHash);
    event ReviewAdded(
        address indexed reviewer,
        address indexed reviewed,
        uint256 rating,
        uint256 milestoneId
    );
    event UserVerified(address indexed user);

    // Project struct to store project details
    struct Project {
        uint256 id;
        address client;
        string title;
        string description;
        uint256 budget;
        uint256 deadline;
        ProjectStatus status;
        string[] requiredSkills;
        uint256 createdAt;
        uint256[] milestoneIds; // Array to track associated milestones
    }

    enum ProjectStatus {
        OPEN,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    // New state variables for projects
    mapping(uint256 => Project) public projects;
    uint256 public projectCounter;
    
    // Constructor
    constructor() Ownable(msg.sender) {
        platformWallet = msg.sender;
    }

    // Milestone Creation
    function createMilestone(
        address _freelancer,
        uint256 _amount,
        string memory _description,
        uint256 _deadline
    ) external payable nonReentrant {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(msg.value > 0, "No ETH sent");
        require(msg.value == _amount, "ETH amount must match milestone amount");

        uint256 milestoneId = ++milestoneCounter;
        milestones[milestoneId] = Milestone({
            id: milestoneId,
            freelancer: _freelancer,
            client: msg.sender,
            amount: _amount,
            description: _description,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            deadline: _deadline,
            deliverablesHash: ""
        });

        emit MilestoneCreated(milestoneId, _freelancer, msg.sender, _amount);
    }

    // Helper function to convert uint to string
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Freelancer Submits Milestone
    function submitMilestone(
        uint256 _milestoneId,
        string memory _deliverablesHash
    ) external {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.freelancer == msg.sender, "Not authorized");
        require(milestone.status == MilestoneStatus.IN_PROGRESS, "Invalid status");
        require(bytes(_deliverablesHash).length > 0, "Deliverables hash required");

        milestone.status = MilestoneStatus.SUBMITTED;
        milestone.deliverablesHash = _deliverablesHash;

        emit MilestoneStatusChanged(_milestoneId, MilestoneStatus.SUBMITTED);
    }

    // Client Approves Milestone
    function approveMilestone(uint256 _milestoneId) external {
        Milestone storage milestone = milestones[_milestoneId];
        
        require(milestone.client == msg.sender, "Not authorized");

        // Handle ETH payment directly to freelancer
        (bool success, ) = milestone.freelancer.call{value: milestone.amount}("");
        require(success, "ETH transfer failed");

        milestone.status = MilestoneStatus.APPROVED;

        emit MilestoneStatusChanged(_milestoneId, MilestoneStatus.APPROVED);
    }

    // Start Milestone - Changes status from PENDING to IN_PROGRESS
    function startMilestone(uint256 _milestoneId) external {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.client == msg.sender, "Not authorized");
        require(milestone.status == MilestoneStatus.PENDING, "Invalid status");
        
        milestone.status = MilestoneStatus.IN_PROGRESS;
        emit MilestoneStatusChanged(_milestoneId, MilestoneStatus.IN_PROGRESS);
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

        // Handle ETH payment
        (bool success, ) = milestone.freelancer.call{value: milestone.amount}("");
        require(success, "ETH transfer failed");
        
        if (dispute.votesForFreelancer > dispute.votesForClient) {
            // Resolve in favor of freelancer
            dispute.outcome = DisputeOutcome.RESOLVED_FOR_FREELANCER;
            milestone.status = MilestoneStatus.APPROVED;
        } else {
            // Resolve in favor of client
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

        // Handle ETH payment
        (bool success, ) = milestone.freelancer.call{value: milestone.amount}("");
        require(success, "ETH transfer failed");
    }

    // Fallback Functions
    receive() external payable {}
    fallback() external payable {}

    // Profile Management Functions
    function updateProfile(
        string memory _ipfsHash,
        string memory _profileImage
    ) external {
        UserProfile storage profile = userProfiles[msg.sender];
        profile.ipfsHash = _ipfsHash;
        profile.profileImage = _profileImage;
        emit ProfileUpdated(msg.sender, _ipfsHash);
    }

    function verifyUser(address _user) external onlyOwner {
        verifiedUsers[_user] = true;
        userProfiles[_user].isVerified = true;
        emit UserVerified(_user);
    }

    // Review System
    function addReview(
        address _reviewed,
        uint256 _rating,
        string memory _comment,
        uint256 _milestoneId
    ) external {
        require(_rating >= 1 && _rating <= 5, "Invalid rating");
        require(!milestoneReviewed[_milestoneId][msg.sender], "Already reviewed");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.APPROVED,
            "Milestone not completed"
        );
        require(
            msg.sender == milestone.client || msg.sender == milestone.freelancer,
            "Unauthorized"
        );

        UserProfile storage profile = userProfiles[_reviewed];
        uint256 reviewId = profile.reviewCount++;
        
        Review storage review = profile.reviews[reviewId];
        review.reviewer = msg.sender;
        review.rating = _rating;
        review.comment = _comment;
        review.timestamp = block.timestamp;
        review.milestoneId = _milestoneId;

        // Update average rating
        profile.averageRating = (
            (profile.averageRating * (profile.reviewCount - 1) + (_rating * 100))
        ) / profile.reviewCount;

        milestoneReviewed[_milestoneId][msg.sender] = true;

        emit ReviewAdded(msg.sender, _reviewed, _rating, _milestoneId);
    }

    // Getter functions for profile data
    function getUserProfile(
        address _user
    ) external view returns (
        string memory ipfsHash,
        string memory profileImage,
        uint256 totalJobs,
        uint256 completedJobs,
        uint256 averageRating,
        bool isVerified,
        uint256 reviewCount
    ) {
        UserProfile storage profile = userProfiles[_user];
        return (
            profile.ipfsHash,
            profile.profileImage,
            profile.totalJobs,
            profile.completedJobs,
            profile.averageRating,
            profile.isVerified,
            profile.reviewCount
        );
    }

    function getReview(
        address _user,
        uint256 _reviewId
    ) external view returns (
        address reviewer,
        uint256 rating,
        string memory comment,
        uint256 timestamp,
        uint256 milestoneId
    ) {
        Review storage review = userProfiles[_user].reviews[_reviewId];
        return (
            review.reviewer,
            review.rating,
            review.comment,
            review.timestamp,
            review.milestoneId
        );
    }

    // New function to create a project
    function createProject(
        string memory _title,
        string memory _description,
        uint256 _budget,
        uint256 _deadline,
        string[] memory _requiredSkills
    ) external returns (uint256) {
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_budget > 0, "Invalid budget");
        
        uint256 projectId = ++projectCounter;
        
        projects[projectId] = Project({
            id: projectId,
            client: msg.sender,
            title: _title,
            description: _description,
            budget: _budget,
            deadline: _deadline,
            status: ProjectStatus.OPEN,
            requiredSkills: _requiredSkills,
            createdAt: block.timestamp,
            milestoneIds: new uint256[](0)
        });

        emit ProjectCreated(projectId, msg.sender, _title, _budget, _deadline);
        return projectId;
    }

    // Function to get all projects
    function getAllProjects() external view returns (
        uint256[] memory ids,
        address[] memory clients,
        string[] memory titles,
        uint256[] memory budgets,
        uint256[] memory deadlines,
        ProjectStatus[] memory statuses
    ) {
        uint256[] memory projectIds = new uint256[](projectCounter);
        address[] memory projectClients = new address[](projectCounter);
        string[] memory projectTitles = new string[](projectCounter);
        uint256[] memory projectBudgets = new uint256[](projectCounter);
        uint256[] memory projectDeadlines = new uint256[](projectCounter);
        ProjectStatus[] memory projectStatuses = new ProjectStatus[](projectCounter);

        for (uint256 i = 1; i <= projectCounter; i++) {
            Project storage project = projects[i];
            projectIds[i-1] = project.id;
            projectClients[i-1] = project.client;
            projectTitles[i-1] = project.title;
            projectBudgets[i-1] = project.budget;
            projectDeadlines[i-1] = project.deadline;
            projectStatuses[i-1] = project.status;
        }

        return (
            projectIds,
            projectClients,
            projectTitles,
            projectBudgets,
            projectDeadlines,
            projectStatuses
        );
    }

    // Events
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed client,
        string title,
        uint256 budget,
        uint256 deadline
    );

    event ProjectStatusUpdated(
        uint256 indexed projectId,
        ProjectStatus status
    );

    // Get milestone details with all related data
    function getMilestoneDetails(uint256 _milestoneId) external view returns (
        uint256 id,
        address freelancer,
        address client,
        uint256 amount,
        string memory description,
        MilestoneStatus status,
        uint256 createdAt,
        uint256 deadline,
        string memory deliverablesHash
    ) {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.id,
            milestone.freelancer,
            milestone.client,
            milestone.amount,
            milestone.description,
            milestone.status,
            milestone.createdAt,
            milestone.deadline,
            milestone.deliverablesHash
        );
    }

    // Get all milestones for a user (either as client or freelancer)
    function getUserMilestones(address _user) external view returns (uint256[] memory) {
        uint256[] memory userMilestones = new uint256[](milestoneCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= milestoneCounter; i++) {
            if (milestones[i].client == _user || milestones[i].freelancer == _user) {
                userMilestones[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(userMilestones, count)
        }
        
        return userMilestones;
    }

    event DeliverablesSubmitted(
        uint256 indexed milestoneId,
        string deliverablesHash,
        uint256 timestamp
    );
}