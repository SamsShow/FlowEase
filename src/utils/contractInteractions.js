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

  async createMilestone(freelancer, amount, description, deadline) {
    try {
      const contract = await this.getContract();
      
      // Convert amount to Wei if it's not already
      const amountInWei = typeof amount === 'string' || typeof amount === 'number' 
        ? ethers.parseEther(amount.toString())
        : amount;

      console.log('Creating milestone with:', {
        freelancer,
        amount: amountInWei.toString(),
        description,
        deadline
      });

      // Send transaction with exact ETH value
      const tx = await contract.createMilestone(
        freelancer,
        amountInWei,
        description,
        deadline,
        { 
          value: amountInWei // Send exact amount as ETH value
        }
      );

      return tx;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }

  async createProject(title, description, budget, deadline, skills) {
    try {
      const contract = await this.getContract()
      const provider = await this.getProvider()

      // Ensure budget is a valid number before parsing
      const parsedBudget = ethers.parseEther(budget.toString())
      
      // Ensure deadline is a number
      const deadlineTimestamp = BigInt(Math.floor(deadline))

      // Ensure skills is an array
      const skillsArray = Array.isArray(skills) ? skills : []

      // Estimate gas first
      const gasEstimate = await contract.createProject.estimateGas(
        title,
        description,
        parsedBudget,
        deadlineTimestamp,
        skillsArray
      )

      // Add 20% buffer to gas estimate
      const gasLimit = (BigInt(gasEstimate) * BigInt(120)) / BigInt(100)

      // Send the transaction and return the transaction object
      return await contract.createProject(
        title,
        description,
        parsedBudget,
        deadlineTimestamp,
        skillsArray,
        { gasLimit }
      )
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
      const contract = await this.getContract();
      const projectsData = await contract.getAllProjects();
      
      console.log("Raw projects data:", projectsData);

      // Destructure the returned arrays
      const [ids, clients, titles, budgets, deadlines, statuses] = projectsData;

      // Combine the arrays into an array of project objects
      const projects = ids.map((id, index) => {
        try {
          return {
            id: id.toString(),
            client: clients[index],
            title: titles[index],
            description: titles[index], // Since description isn't returned by getAllProjects
            budget: ethers.formatEther(budgets[index]),
            deadline: deadlines[index].toString(),
            status: this.getProjectStatus(statuses[index]),
            timestamp: deadlines[index].toString(), // Using deadline as timestamp since it's not returned
            skills: [] // Skills aren't returned by getAllProjects
          };
        } catch (itemError) {
          console.error("Error processing project item:", itemError);
          return null;
        }
      }).filter(Boolean); // Remove any null entries

      console.log("Processed projects:", projects);
      return projects;

    } catch (error) {
      console.error("Error in getAllProjects:", error);
      throw error;
    }
  }

  getProjectStatus(statusCode) {
    const statuses = {
      0: 'open',
      1: 'in_progress',
      2: 'completed',
      3: 'cancelled',
      4: 'disputed'
    };
    return statuses[statusCode] || 'unknown';
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

  async getMilestoneDetails(milestoneId) {
    try {
      const contract = await this.getContract();
      const details = await contract.getMilestoneDetails(milestoneId);
      return {
        id: details.id.toString(),
        freelancer: details.freelancer,
        client: details.client,
        amount: details.amount,
        description: details.description,
        status: details.status,
        createdAt: Number(details.createdAt),
        deadline: Number(details.deadline),
        deliverablesHash: details.deliverablesHash
      };
    } catch (error) {
      console.error('Error getting milestone details:', error);
      throw error;
    }
  }

  async getUserMilestones(address) {
    try {
      const contract = await this.getContract();
      const milestoneIds = await contract.getUserMilestones(address);
      return milestoneIds.map(id => id.toString());
    } catch (error) {
      console.error('Error getting user milestones:', error);
      throw error;
    }
  }

  async releaseMilestone(milestoneId) {
    try {
      const contract = await this.getContract();
      const tx = await contract.approveMilestone(milestoneId);
      return tx;
    } catch (error) {
      console.error('Error releasing milestone:', error);
      throw error;
    }
  }

  async disputeMilestone(milestoneId, reason) {
    try {
      const contract = await this.getContract();
      const tx = await contract.raiseMilestoneDispute(milestoneId, reason);
      return tx;
    } catch (error) {
      console.error('Error disputing milestone:', error);
      throw error;
    }
  }

  async getAllMilestones() {
    try {
      const contract = await this.getContract();
      const milestoneCount = await contract.milestoneCounter();
      const milestones = [];

      for (let i = 1; i <= milestoneCount; i++) {
        try {
          const milestone = await contract.getMilestoneDetails(i);
          milestones.push({
            id: milestone.id.toString(),
            freelancer: milestone.freelancer,
            client: milestone.client,
            amount: ethers.formatEther(milestone.amount),
            description: milestone.description,
            status: this.getMilestoneStatus(milestone.status),
            createdAt: Number(milestone.createdAt),
            deadline: Number(milestone.deadline),
            deliverablesHash: milestone.deliverablesHash
          });
        } catch (error) {
          console.error(`Error fetching milestone ${i}:`, error);
          continue;
        }
      }

      return milestones;
    } catch (error) {
      console.error('Error getting all milestones:', error);
      throw error;
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
    };
    return statuses[statusCode] || 'unknown';
  }
}

export const contractInteractions = new ContractInteractions()
