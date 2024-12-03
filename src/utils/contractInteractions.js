import { ethers } from 'ethers'
import contractABI from '../config/abi.json'
import { contractAddress } from './constants'

export class ContractInteractions {
  constructor() {
    this.contractAddress = contractAddress
    this.contractABI = contractABI
  }

  async getContract() {
    if (!window.ethereum) throw new Error("No wallet found!")
    
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    return new ethers.Contract(this.contractAddress, this.contractABI, signer)
  }

  async getProvider() {
    if (!window.ethereum) throw new Error("No wallet found!")
    
    return new ethers.BrowserProvider(window.ethereum)
  }

  async getUserProfile(address) {
    try {
      if (!address) throw new Error("Address is required")
      
      const contract = await this.getContract()
      const profile = await contract.getUserProfile(address)

      // Convert BigInts to numbers and format the response
      return {
        ipfsHash: profile[0],
        profileImage: profile[1],
        totalJobs: Number(profile[2]),
        completedJobs: Number(profile[3]),
        averageRating: Number(profile[4]) / 100, // Convert from scaled integer
        isVerified: profile[5],
        reviewCount: Number(profile[6])
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      throw error
    }
  }

  async getReview(userAddress, reviewId) {
    try {
      const contract = await this.getContract()
      const review = await contract.getReview(userAddress, reviewId)

      return {
        reviewer: review[0],
        rating: Number(review[1]),
        comment: review[2],
        timestamp: Number(review[3]),
        milestoneId: Number(review[4])
      }
    } catch (error) {
      console.error("Error fetching review:", error)
      throw error
    }
  }

  async updateProfile(ipfsHash, profileImageHash) {
    try {
      const contract = await this.getContract()
      const tx = await contract.updateProfile(ipfsHash, profileImageHash)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    }
  }

  async createMilestone(freelancerAddress, amount, description, deadline) {
    try {
      const contract = await this.getContract()
      const provider = await this.getProvider()
      
      // Format parameters
      const params = {
        freelancer: freelancerAddress,
        amount: amount,
        description: description,
        deadline: BigInt(deadline)
      }

      const feeData = await provider.getFeeData()
      
      const txParams = {
        value: params.amount,
        gasPrice: feeData.gasPrice
      }

      // Try to estimate gas
      let gasLimit
      try {
        const gasEstimate = await contract.createMilestone.estimateGas(
          params.freelancer,
          params.amount,
          params.description,
          params.deadline,
          txParams
        )
        gasLimit = Math.floor(Number(gasEstimate) * 1.2)
      } catch (gasError) {
        console.error("Gas estimation failed:", gasError)
        gasLimit = 500000
      }

      txParams.gasLimit = gasLimit

      const transaction = await contract.createMilestone(
        params.freelancer,
        params.amount,
        params.description,
        params.deadline,
        txParams
      )

      const receipt = await transaction.wait()
      return receipt.hash
    } catch (error) {
      console.error("Error creating milestone:", error)
      throw error
    }
  }

  async createProject(title, description, budget, deadline, skills) {
    try {
      const contract = await this.getContract()
      const provider = await this.getProvider()

      const tx = await contract.createProject(
        title,
        description,
        ethers.parseEther(budget.toString()),
        Math.floor(deadline.getTime() / 1000),
        skills
      )

      const receipt = await tx.wait()
      return receipt.hash
    } catch (error) {
      console.error("Error creating project:", error)
      throw error
    }
  }

  async getEscrowDetails(escrowId) {
    try {
      const contract = await this.getContract()
      const escrow = await contract.getEscrow(escrowId)
      
      return {
        client: escrow[0],
        freelancer: escrow[1],
        amount: ethers.formatEther(escrow[2]),
        status: Number(escrow[3]),
        deadline: Number(escrow[4]),
        milestones: escrow[5].map(m => ({
          description: m.description,
          amount: ethers.formatEther(m.amount),
          completed: m.completed
        }))
      }
    } catch (error) {
      console.error("Error fetching escrow:", error)
      throw error
    }
  }

  async getAllProjects() {
    try {
      const contract = await this.getContract()
      const milestoneCounter = await contract.milestoneCounter()
      const projects = []
      
      // Iterate through milestones to get project data
      for (let i = 0; i < Number(milestoneCounter); i++) {
        const milestone = await contract.milestones(i)
        projects.push({
          id: Number(milestone.id),
          title: milestone.description,
          description: milestone.description,
          budget: ethers.formatEther(milestone.amount),
          deadline: Number(milestone.deadline),
          client: milestone.client,
          freelancer: milestone.freelancer,
          status: this.getMilestoneStatus(Number(milestone.status)),
          createdAt: Number(milestone.createdAt)
        })
      }
      
      return projects
    } catch (error) {
      console.error("Error fetching projects:", error)
      throw error
    }
  }

  getMilestoneStatus(statusCode) {
    const statuses = {
      0: 'pending',
      1: 'in_progress',
      2: 'submitted',
      3: 'approved',
      4: 'disputed',
      5: 'rejected'
    }
    return statuses[statusCode] || 'unknown'
  }

  async releaseMilestone(escrowId, milestoneIndex) {
    try {
      const contract = await this.getContract()
      const tx = await contract.releaseMilestone(escrowId, milestoneIndex)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error releasing milestone:", error)
      throw error
    }
  }

  async disputeEscrow(escrowId, reason) {
    try {
      const contract = await this.getContract()
      const tx = await contract.disputeEscrow(escrowId, reason)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error disputing escrow:", error)
      throw error
    }
  }

  async getProjectEscrow(projectId) {
    try {
      const contract = await this.getContract()
      const escrow = await contract.projectEscrows(projectId)
      return {
        amount: ethers.formatEther(escrow.amount),
        deadline: Number(escrow.deadline),
        status: this.getProjectStatus(Number(escrow.status)),
        milestones: escrow.milestones.map(m => ({
          description: m.description,
          amount: ethers.formatEther(m.amount),
          completed: m.completed
        }))
      }
    } catch (error) {
      console.error("Error fetching escrow:", error)
      throw error
    }
  }
}

export const contractInteractions = new ContractInteractions()
