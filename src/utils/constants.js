export const contractAddress = "0x54bC8cfe4A3D3364746109668e5e5984d6f19d3A"; // Replace with your deployed contract address

export const contractABI = [
  // getUserProfile function
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserProfile",
    "outputs": [
      {"internalType": "string", "name": "ipfsHash", "type": "string"},
      {"internalType": "string", "name": "profileImage", "type": "string"},
      {"internalType": "uint256", "name": "totalJobs", "type": "uint256"},
      {"internalType": "uint256", "name": "completedJobs", "type": "uint256"},
      {"internalType": "uint256", "name": "averageRating", "type": "uint256"},
      {"internalType": "bool", "name": "isVerified", "type": "bool"},
      {"internalType": "uint256", "name": "reviewCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // milestoneCounter function
  {
    "inputs": [],
    "name": "milestoneCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // getMilestoneDetails function
  {
    "inputs": [{"internalType": "uint256", "name": "_milestoneId", "type": "uint256"}],
    "name": "getMilestoneDetails",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "freelancer", "type": "address"},
      {"internalType": "address", "name": "client", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "enum FlowEasePaymentSystem.MilestoneStatus", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "string", "name": "deliverablesHash", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // getReview function
  {
    "inputs": [
      {"internalType": "address", "name": "_user", "type": "address"},
      {"internalType": "uint256", "name": "_reviewId", "type": "uint256"}
    ],
    "name": "getReview",
    "outputs": [
      {"internalType": "address", "name": "reviewer", "type": "address"},
      {"internalType": "uint256", "name": "rating", "type": "uint256"},
      {"internalType": "string", "name": "comment", "type": "string"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "uint256", "name": "milestoneId", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // updateProfile function
  {
    "inputs": [
      {"internalType": "string", "name": "_ipfsHash", "type": "string"},
      {"internalType": "string", "name": "_profileImage", "type": "string"}
    ],
    "name": "updateProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // createMilestone function
  {
    "inputs": [
      {"internalType": "address", "name": "_freelancer", "type": "address"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "uint256", "name": "_deadline", "type": "uint256"}
    ],
    "name": "createMilestone",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // submitMilestone function
  {
    "inputs": [
      {"internalType": "uint256", "name": "_milestoneId", "type": "uint256"},
      {"internalType": "string", "name": "_deliverablesHash", "type": "string"}
    ],
    "name": "submitMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // approveMilestone function
  {
    "inputs": [{"internalType": "uint256", "name": "_milestoneId", "type": "uint256"}],
    "name": "approveMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // startMilestone function
  {
    "inputs": [{"internalType": "uint256", "name": "_milestoneId", "type": "uint256"}],
    "name": "startMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // raiseMilestoneDispute function
  {
    "inputs": [
      {"internalType": "uint256", "name": "_milestoneId", "type": "uint256"},
      {"internalType": "string", "name": "_reason", "type": "string"}
    ],
    "name": "raiseMilestoneDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // getUserMilestones function
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserMilestones",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
]; 