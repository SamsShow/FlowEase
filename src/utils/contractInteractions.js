import { ethers } from "ethers";
import contractABI from "../config/abi.json";
import { contractAddress } from "./constants";

export class ContractInteractions {
  constructor() {
    this.contractAddress = contractAddress;
    this.contractABI = contractABI;
  }
  async createMilestoneWithPaymentRequest(
    freelancer,
    amount,
    description,
    deadline
  ) {
    try {
      const contract = await this.getContract();
      const amountInWei = ethers.parseEther(amount.toString());

      // Create milestone on smart contract
      const tx = await contract.createMilestone(
        freelancer,
        amountInWei,
        description,
        deadline,
        { value: amountInWei }
      );

      const receipt = await tx.wait();
      const milestoneId = receipt.events[0].args.milestoneId.toString();

      // Create payment request
      const signer = await this.getProvider().getSigner();
      await requestNetworkHelper.initialize(signer);

      const paymentRequest = await requestNetworkHelper.createPaymentRequest({
        amount,
        payee: freelancer,
        payer: await signer.getAddress(),
        description,
        deadline,
        milestoneId,
      });

      return {
        milestone: receipt,
        paymentRequest,
        milestoneId,
      };
    } catch (error) {
      console.error("Error creating milestone with payment request:", error);
      throw error;
    }
  }

  async getPaymentRequestForMilestone(milestoneId) {
    try {
      const milestone = await this.getMilestoneDetails(milestoneId);
      const signer = await this.getProvider().getSigner();
      await requestNetworkHelper.initialize(signer);

      return await requestNetworkHelper.getPaymentRequest(milestoneId);
    } catch (error) {
      console.error("Error getting payment request:", error);
      throw error;
    }
  }

  async approveMilestonePayment(milestoneId) {
    try {
      // Approve milestone on smart contract
      const milestoneTx = await this.approveMilestone(milestoneId);
      await milestoneTx.wait();

      // Approve payment request
      const signer = await this.getProvider().getSigner();
      await requestNetworkHelper.initialize(signer);
      const paymentRequest = await this.getPaymentRequestForMilestone(
        milestoneId
      );
      await requestNetworkHelper.approvePaymentRequest(
        paymentRequest.requestId
      );

      return {
        success: true,
        milestoneTransaction: milestoneTx,
      };
    } catch (error) {
      console.error("Error approving milestone payment:", error);
      throw error;
    }
  }

  async disputeMilestonePayment(milestoneId, reason) {
    try {
      // Dispute milestone on smart contract
      const milestoneTx = await this.disputeMilestone(milestoneId, reason);
      await milestoneTx.wait();

      // Cancel payment request
      const signer = await this.getProvider().getSigner();
      await requestNetworkHelper.initialize(signer);
      const paymentRequest = await this.getPaymentRequestForMilestone(
        milestoneId
      );
      await requestNetworkHelper.cancelPaymentRequest(paymentRequest.requestId);

      return {
        success: true,
        milestoneTransaction: milestoneTx,
      };
    } catch (error) {
      console.error("Error disputing milestone payment:", error);
      throw error;
    }
  }

  async getContract() {
    if (!window.ethereum) throw new Error("No wallet found!");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      console.log("Connected to network:", network);
      
      const contract = new ethers.Contract(this.contractAddress, this.contractABI, signer);
      console.log("Contract instance created:", {
        address: this.contractAddress,
        signer: await signer.getAddress()
      });
      
      return contract;
    } catch (error) {
      console.error("Error creating contract instance:", error);
      throw error;
    }
  }

  async getProvider() {
    if (!window.ethereum) throw new Error("No wallet found!");

    return new ethers.BrowserProvider(window.ethereum);
  }

  async getUserProfile(address) {
    try {
      if (!address) throw new Error("Address is required");

      const contract = await this.getContract();
      console.log("Fetching profile for address:", address);
      
      const profile = await contract.getUserProfile(address);
      console.log("Raw profile data:", profile);

      // Handle the returned data as an array
      if (Array.isArray(profile)) {
        return profile;
      }

      // If it's returned as an object with named properties
      if (profile && typeof profile === 'object') {
        return [
          profile.ipfsHash || '',
          profile.profileImage || '',
          profile.totalJobs ? profile.totalJobs.toString() : '0',
          profile.completedJobs ? profile.completedJobs.toString() : '0',
          profile.averageRating ? profile.averageRating.toString() : '0',
          profile.isVerified || false,
          profile.reviewCount ? profile.reviewCount.toString() : '0'
        ];
      }

      // Return default values if no profile found
      return ['', '', '0', '0', '0', false, '0'];
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  async getReview(userAddress, reviewId) {
    try {
      const contract = await this.getContract();
      const review = await contract.getReview(userAddress, reviewId);

      return {
        reviewer: review[0],
        rating: Number(review[1]),
        comment: review[2],
        timestamp: Number(review[3]),
        milestoneId: Number(review[4]),
      };
    } catch (error) {
      console.error("Error fetching review:", error);
      throw error;
    }
  }

  async updateProfile(ipfsHash, profileImageHash) {
    try {
      const contract = await this.getContract();
      const tx = await contract.updateProfile(ipfsHash, profileImageHash);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  async createMilestone(freelancer, amount, description, deadline) {
    try {
      const contract = await this.getContract();

      // Ensure proper conversion to Wei
      const amountInWei = this.formatEthToWei(amount);

      console.log("Creating milestone with:", {
        freelancer,
        amount: amountInWei.toString(),
        description,
        deadline,
      });

      const tx = await contract.createMilestone(
        freelancer,
        amountInWei,
        description,
        deadline,
        {
          value: amountInWei,
        }
      );

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error("Error creating milestone:", error);
      throw error;
    }
  }

  async createProject(title, description, budget, deadline, skills) {
    try {
      const contract = await this.getContract();

      // Convert budget from ETH to Wei
      const budgetInWei = ethers.parseEther(budget.toString());

      // Ensure deadline is a BigInt
      const deadlineTimestamp = BigInt(deadline);

      // Ensure skills is an array
      const skillsArray = Array.isArray(skills) ? skills : [];

      console.log("Creating project with:", {
        title,
        description,
        budgetInWei: budgetInWei.toString(),
        deadline: deadlineTimestamp.toString(),
        skills: skillsArray,
      });

      // Send the transaction
      const tx = await contract.createProject(
        title,
        description,
        budgetInWei,
        deadlineTimestamp,
        skillsArray
      );

      return tx;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  }

  async getEscrowDetails(escrowId) {
    try {
      const contract = await this.getContract();
      const escrow = await contract.getEscrow(escrowId);

      return {
        client: escrow[0],
        freelancer: escrow[1],
        amount: ethers.formatEther(escrow[2]),
        status: Number(escrow[3]),
        deadline: Number(escrow[4]),
        milestones: escrow[5].map((m) => ({
          description: m.description,
          amount: ethers.formatEther(m.amount),
          completed: m.completed,
        })),
      };
    } catch (error) {
      console.error("Error fetching escrow:", error);
      throw error;
    }
  }
  async getMilestones() {
    try {
      const contract = await this.getContract();
      console.log("Fetching milestone counter...");
      const milestoneCount = await contract.milestoneCounter();
      console.log("Milestone count:", milestoneCount);
      
      const milestones = [];

      for (let i = 1; i <= milestoneCount; i++) {
        try {
          console.log(`Fetching details for milestone ${i}...`);
          const milestone = await contract.getMilestoneDetails(i);
          console.log(`Raw milestone ${i} data:`, milestone);
          
          if (milestone) {
            milestones.push({
              id: milestone.id ? milestone.id.toString() : i.toString(),
              freelancer: milestone.freelancer,
              client: milestone.client,
              amount: this.formatWeiToEth(milestone.amount),
              description: milestone.description || '',
              status: this.getMilestoneStatus(Number(milestone.status || 0)),
              statusCode: Number(milestone.status || 0),
              createdAt: Number(milestone.createdAt || 0),
              deadline: Number(milestone.deadline || 0),
              deliverablesHash: milestone.deliverablesHash || ''
            });
          }
        } catch (error) {
          console.error(`Error fetching milestone ${i}:`, error);
          continue;
        }
      }

      console.log("Processed milestones:", milestones);
      return milestones.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Error getting all milestones:", error);
      throw error;
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
      const projects = ids
        .map((id, index) => {
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
              skills: [], // Skills aren't returned by getAllProjects
            };
          } catch (itemError) {
            console.error("Error processing project item:", itemError);
            return null;
          }
        })
        .filter(Boolean); // Remove any null entries

      console.log("Processed projects:", projects);
      return projects;
    } catch (error) {
      console.error("Error in getAllProjects:", error);
      throw error;
    }
  }

  getProjectStatus(statusCode) {
    const statuses = {
      0: "open",
      1: "in_progress",
      2: "completed",
      3: "cancelled",
      4: "disputed",
    };
    return statuses[statusCode] || "unknown";
  }

  async releaseMilestone(escrowId, milestoneIndex) {
    try {
      const contract = await this.getContract();
      const tx = await contract.releaseMilestone(escrowId, milestoneIndex);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error releasing milestone:", error);
      throw error;
    }
  }

  async disputeEscrow(escrowId, reason) {
    try {
      const contract = await this.getContract();
      const tx = await contract.disputeEscrow(escrowId, reason);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error disputing escrow:", error);
      throw error;
    }
  }

  async getProjectEscrow(projectId) {
    try {
      const contract = await this.getContract();
      const escrow = await contract.projectEscrows(projectId);
      return {
        amount: ethers.formatEther(escrow.amount),
        deadline: Number(escrow.deadline),
        status: this.getProjectStatus(Number(escrow.status)),
        milestones: escrow.milestones.map((m) => ({
          description: m.description,
          amount: ethers.formatEther(m.amount),
          completed: m.completed,
        })),
      };
    } catch (error) {
      console.error("Error fetching escrow:", error);
      throw error;
    }
  }

  getMilestoneStatus(statusCode) {
    const statuses = {
      0: "pending",
      1: "in_progress",
      2: "submitted",
      3: "approved",
      4: "disputed",
      5: "rejected",
    };
    return statuses[statusCode] || "unknown";
  }

  async getMilestoneDetails(milestoneId) {
    try {
      const contract = await this.getContract();
      const details = await contract.getMilestoneDetails(milestoneId);

      console.log("Raw milestone details:", details);
      console.log("Status code:", Number(details.status));

      const milestone = {
        id: Number(details.id),
        freelancer: details.freelancer,
        client: details.client,
        amount: details.amount,
        description: details.description,
        status: this.getMilestoneStatus(Number(details.status)),
        statusCode: Number(details.status),
        createdAt: Number(details.createdAt),
        deadline: Number(details.deadline),
        deliverablesHash: details.deliverablesHash,
      };

      console.log("Processed milestone:", milestone);
      return milestone;
    } catch (error) {
      console.error("Error getting milestone details:", error);
      throw error;
    }
  }

  async getUserMilestones(address) {
    try {
      const contract = await this.getContract();
      const milestoneIds = await contract.getUserMilestones(address);
      return milestoneIds.map((id) => id.toString());
    } catch (error) {
      console.error("Error getting user milestones:", error);
      throw error;
    }
  }

  async releaseMilestone(milestoneId) {
    try {
      const contract = await this.getContract();
      const tx = await contract.approveMilestone(milestoneId);
      return tx;
    } catch (error) {
      console.error("Error releasing milestone:", error);
      throw error;
    }
  }

  async disputeMilestone(milestoneId, reason) {
    try {
      const contract = await this.getContract();
      const tx = await contract.raiseMilestoneDispute(milestoneId, reason);
      return tx;
    } catch (error) {
      console.error("Error disputing milestone:", error);
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
            deliverablesHash: milestone.deliverablesHash,
          });
        } catch (error) {
          console.error(`Error fetching milestone ${i}:`, error);
          continue;
        }
      }

      return milestones;
    } catch (error) {
      console.error("Error getting all milestones:", error);
      throw error;
    }
  }

  async submitMilestone(milestoneId, deliverablesHash) {
    try {
      const contract = await this.getContract();
      const tx = await contract.submitMilestone(
        milestoneId,
        deliverablesHash || ""
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error submitting milestone:", error);
      throw error;
    }
  }

  async approveMilestone(milestoneId) {
    try {
      const contract = await this.getContract();
      const tx = await contract.approveMilestone(milestoneId);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error approving milestone:", error);
      throw error;
    }
  }

  async startMilestone(milestoneId) {
    try {
      const contract = await this.getContract();
      const tx = await contract.startMilestone(milestoneId);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error starting milestone:", error);
      throw error;
    }
  }

  async addReview(reviewedAddress, rating, comment, milestoneId) {
    try {
      const contract = await this.getContract();
      const tx = await contract.addReview(
        reviewedAddress,
        rating,
        comment,
        milestoneId
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error adding review:", error);
      throw error;
    }
  }

  async getUserMilestones(address) {
    try {
      const contract = await this.getContract();
      const milestones = await contract.getUserMilestones(address);
      return milestones.map((id) => Number(id));
    } catch (error) {
      console.error("Error getting user milestones:", error);
      throw error;
    }
  }

  async getMilestoneTransactions(address) {
    try {
      const contract = await this.getContract();
      const provider = await this.getProvider();

      // Get all milestone events related to the address
      const filter = {
        fromBlock: 0,
        toBlock: "latest",
        address: this.contractAddress,
      };

      // Get milestone creation events
      const creationEvents = await provider.getLogs({
        ...filter,
        topics: [
          ethers.id("MilestoneCreated(uint256,address,address,uint256)"),
          null,
          ethers.zeroPadValue(address, 32),
        ],
      });

      // Get milestone status change events
      const statusEvents = await provider.getLogs({
        ...filter,
        topics: [ethers.id("MilestoneStatusChanged(uint256,uint8)")],
      });

      // Process and combine the events
      const transactions = [];

      for (const event of creationEvents) {
        const parsedEvent = contract.interface.parseLog({
          topics: event.topics,
          data: event.data,
        });

        transactions.push({
          id: event.transactionHash,
          type: "Milestone Created",
          amount: ethers.formatEther(parsedEvent.args.amount),
          timestamp: (await provider.getBlock(event.blockNumber)).timestamp,
          hash: event.transactionHash,
        });
      }

      for (const event of statusEvents) {
        const parsedEvent = contract.interface.parseLog({
          topics: event.topics,
          data: event.data,
        });

        if (parsedEvent.args.newStatus.toString() === "3") {
          // APPROVED status
          const milestone = await contract.getMilestoneDetails(
            parsedEvent.args.milestoneId
          );
          if (
            milestone.freelancer === address ||
            milestone.client === address
          ) {
            transactions.push({
              id: event.transactionHash,
              type:
                milestone.freelancer === address
                  ? "Payment Received"
                  : "Payment Sent",
              amount: ethers.formatEther(milestone.amount),
              timestamp: (await provider.getBlock(event.blockNumber)).timestamp,
              hash: event.transactionHash,
            });
          }
        }
      }

      // Sort by timestamp, most recent first
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error getting milestone transactions:", error);
      throw error;
    }
  }

  // Add these utility methods
  formatEthToWei(ethAmount) {
    try {
      // Handle string numbers with decimals
      return ethers.parseEther(ethAmount.toString());
    } catch (error) {
      console.error("Error converting ETH to Wei:", error);
      throw new Error("Invalid ETH amount");
    }
  }

  formatWeiToEth(weiAmount) {
    try {
      return ethers.formatEther(weiAmount);
    } catch (error) {
      console.error("Error converting Wei to ETH:", error);
      throw new Error("Invalid Wei amount");
    }
  }
}

export const contractInteractions = new ContractInteractions();
