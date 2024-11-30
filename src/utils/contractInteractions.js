import { ethers } from 'ethers'
import abi from '../config/abi.json'

const CONTRACT_ADDRESS = "0xEE9802Fa1649beC3b766f948683F35120D2360C6"

export class ContractInteractions {
  constructor() {
    this.provider = null
    this.signer = null
    this.contract = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    if (!window.ethereum) {
      throw new Error("Please install MetaMask!")
    }

    // Initialize ethers provider and signer
    this.provider = new ethers.BrowserProvider(window.ethereum)
    this.signer = await this.provider.getSigner()
    
    // Initialize contract instance
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, abi, this.signer)
    this.initialized = true
  }

  // Milestone Management Functions
  async createMilestone(freelancerAddress, tokenAddress, amount, description, deadline) {
    await this.init()
    try {
      const tx = await this.contract.createMilestone(
        freelancerAddress,
        tokenAddress,
        amount,
        description,
        deadline
      )
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error creating milestone:", error)
      throw error
    }
  }

  async submitMilestone(milestoneId) {
    await this.init()
    try {
      const tx = await this.contract.submitMilestone(milestoneId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error submitting milestone:", error)
      throw error
    }
  }

  async approveMilestone(milestoneId) {
    await this.init()
    try {
      const tx = await this.contract.approveMilestone(milestoneId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error approving milestone:", error)
      throw error
    }
  }

  // Dispute Management Functions
  async raiseMilestoneDispute(milestoneId, reason) {
    await this.init()
    try {
      const tx = await this.contract.raiseMilestoneDispute(milestoneId, reason)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error raising dispute:", error)
      throw error
    }
  }

  async voteOnDispute(disputeId, voteForFreelancer) {
    await this.init()
    try {
      const tx = await this.contract.voteOnDispute(disputeId, voteForFreelancer)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error voting on dispute:", error)
      throw error
    }
  }

  async resolveDispute(disputeId) {
    await this.init()
    try {
      const tx = await this.contract.resolveDispute(disputeId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error resolving dispute:", error)
      throw error
    }
  }

  // Read Functions
  async getMilestone(milestoneId) {
    await this.init()
    try {
      const milestone = await this.contract.milestones(milestoneId)
      return {
        id: milestone.id.toString(),
        freelancer: milestone.freelancer,
        client: milestone.client,
        tokenAddress: milestone.tokenAddress,
        amount: ethers.formatEther(milestone.amount),
        platformFee: ethers.formatEther(milestone.platformFee),
        description: milestone.description,
        status: milestone.status,
        createdAt: new Date(milestone.createdAt * 1000),
        deadline: new Date(milestone.deadline * 1000)
      }
    } catch (error) {
      console.error("Error fetching milestone:", error)
      throw error
    }
  }

  async getDispute(disputeId) {
    await this.init()
    try {
      const dispute = await this.contract.disputes(disputeId)
      return {
        milestoneId: dispute.milestoneId.toString(),
        disputedBy: dispute.disputedBy,
        reason: dispute.reason,
        createdAt: new Date(dispute.createdAt * 1000),
        outcome: dispute.outcome,
        votingDeadline: new Date(dispute.votingDeadline * 1000),
        votesForFreelancer: dispute.votesForFreelancer.toString(),
        votesForClient: dispute.votesForClient.toString()
      }
    } catch (error) {
      console.error("Error fetching dispute:", error)
      throw error
    }
  }

  // Token Management Functions
  async whitelistToken(tokenAddress, status) {
    await this.init()
    try {
      const tx = await this.contract.whitelistToken(tokenAddress, status)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error whitelisting token:", error)
      throw error
    }
  }

  async isTokenWhitelisted(tokenAddress) {
    await this.init()
    try {
      return await this.contract.allowedTokens(tokenAddress)
    } catch (error) {
      console.error("Error checking token whitelist status:", error)
      throw error
    }
  }

  // Event Listeners
  async listenToMilestoneEvents(callback) {
    await this.init()
    this.contract.on("MilestoneCreated", (milestoneId, freelancer, client, amount) => {
      callback({
        milestoneId: milestoneId.toString(),
        freelancer,
        client,
        amount: ethers.formatEther(amount)
      })
    })

    this.contract.on("MilestoneStatusChanged", (milestoneId, newStatus) => {
      callback({
        milestoneId: milestoneId.toString(),
        newStatus
      })
    })
  }

  async listenToDisputeEvents(callback) {
    await this.init()
    this.contract.on("DisputeRaised", (disputeId, milestoneId, disputedBy) => {
      callback({
        disputeId: disputeId.toString(),
        milestoneId: milestoneId.toString(),
        disputedBy
      })
    })

    this.contract.on("DisputeResolved", (disputeId, outcome) => {
      callback({
        disputeId: disputeId.toString(),
        outcome
      })
    })
  }

  // Helper function to format amounts
  static formatAmount(amount) {
    return ethers.formatEther(amount)
  }

  // Helper function to parse amounts
  static parseAmount(amount) {
    return ethers.parseEther(amount.toString())
  }
}

// Export singleton instance
export const contractInteractions = new ContractInteractions()
