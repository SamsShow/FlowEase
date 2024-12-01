import { ethers } from 'ethers'
import { contractAddress, contractABI } from './constants'

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

  async createEscrow(clientAddress, amount, milestones, deadline) {
    try {
      const contract = await this.getContract()
      const tx = await contract.createEscrow(clientAddress, milestones, deadline, {
        value: amount
      })
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error("Error creating escrow:", error)
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
      const projectCount = await contract.getProjectCount()
      
      const projects = []
      for (let i = 0; i < projectCount; i++) {
        const project = await contract.projects(i)
        projects.push({
          id: i,
          title: project.title,
          description: project.description,
          budget: ethers.formatEther(project.budget),
          deadline: Number(project.deadline),
          client: project.client,
          freelancer: project.freelancer,
          status: this.getProjectStatus(Number(project.status)),
          skills: project.skills || []
        })
      }
      
      return projects
    } catch (error) {
      console.error("Error fetching projects:", error)
      throw error
    }
  }

  getProjectStatus(statusCode) {
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
