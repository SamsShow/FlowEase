export const contractAddress = "0x9329c435cBAD297A6E543810F939323f57320cda"; // Replace with your deployed contract address

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
  }
]; 