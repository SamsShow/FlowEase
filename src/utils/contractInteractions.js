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
        
        // Validate inputs before contract interaction
        if (!ethers.isAddress(freelancerAddress)) {
            throw new Error("Invalid freelancer address")
        }

        if (description.length === 0 || description.length > 500) {
            throw new Error("Description must be between 1-500 characters")
        }

        // Validate deadline is in the future
        const currentTimestamp = Math.floor(Date.now() / 1000)
        if (deadline <= currentTimestamp) {
            throw new Error("Deadline must be in the future")
        }

        const params = {
            freelancer: freelancerAddress,
            tokenAddress: "0x0000000000000000000000000000000000000000",
            amount: amount,
            description: description,
            deadline: BigInt(deadline)
        }

        const feeData = await provider.getFeeData()
        
        const txParams = {
            value: params.amount,
            gasPrice: feeData.gasPrice
        }

        // Enhanced gas estimation with detailed logging
        let gasLimit
        try {
            console.log("Estimating gas with params:", {
                freelancer: params.freelancer,
                tokenAddress: params.tokenAddress,
                amount: params.amount.toString(),
                description: params.description,
                deadline: params.deadline.toString()
            })

            const gasEstimate = await contract.createMilestone.estimateGas(
                params.freelancer,
                params.tokenAddress,
                params.amount,
                params.description,
                params.deadline,
                txParams
            )
            gasLimit = Math.floor(Number(gasEstimate) * 1.2)
            console.log("Estimated gas:", gasLimit)
        } catch (gasError) {
            console.error("Detailed gas estimation error:", {
                message: gasError.message,
                code: gasError.code,
                reason: gasError.reason,
                details: gasError
            })

            // Fallback gas limit with more conservative estimate
            gasLimit = 500000 // Increased from previous 300000
        }

        txParams.gasLimit = gasLimit

        const transaction = await contract.createMilestone(
            params.freelancer,
            params.tokenAddress,
            params.amount,
            params.description,
            params.deadline,
            txParams
        )

        const receipt = await transaction.wait()
        
        if (receipt.status === 0) {
            throw new Error("Transaction failed on-chain")
        }

        return receipt.hash

    } catch (error) {
        console.error("Comprehensive milestone creation error:", {
            message: error.message,
            code: error.code,
            stack: error.stack,
            details: error
        })

        // More specific error handling
        if (error.code === 'CALL_EXCEPTION') {
            throw new Error("Contract call failed. Check contract conditions and parameters.")
        }

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
      
      // Get milestone counter
      const milestoneCounter = await contract.milestoneCounter()
      const projects = []
      
      // Iterate through all milestones
      for (let i = 0; i < Number(milestoneCounter); i++) {
        const milestone = await contract.milestones(i)
        
        // Format the project data
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
      0: 'open',
      1: 'in_progress',
      2: 'completed',
      3: 'disputed'
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

  async createProject(title, description, budget, deadline, skills) {
    try {
      const contract = await this.getContract()
      const tx = await contract.createProject(
        title,
        description,
        ethers.parseEther(budget.toString()),
        deadline,
        skills.split(',').map(s => s.trim())
      )
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error creating project:", error)
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
