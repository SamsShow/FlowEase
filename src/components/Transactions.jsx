import { contractInteractions } from '../utils/contractInteractions'

// Example usage in a component
const handleCreateMilestone = async () => {
  try {
    const tx = await contractInteractions.createMilestone(
      freelancerAddress,
      tokenAddress,
      contractInteractions.parseAmount(amount),
      description,
      Math.floor(deadline.getTime() / 1000)
    )
    console.log("Milestone created:", tx)
  } catch (error) {
    console.error("Error:", error)
  }
}

export default handleCreateMilestone
