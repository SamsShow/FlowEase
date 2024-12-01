import { ethers } from 'ethers';

export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask!");
    }

    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    // Get provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Get signer
    const signer = provider.getSigner();

    return {
      address: accounts[0],
      provider,
      signer
    };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

export const getNetworkDetails = async () => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    return network;
  } catch (error) {
    console.error("Error getting network details:", error);
    throw error;
  }
}; 