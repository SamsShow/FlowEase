import { RequestNetwork } from '@requestnetwork/request-client.js';
import { Web3SignatureProvider } from '@requestnetwork/web3-signature';
import { ethers } from 'ethers';

class RequestNetworkHelper {
  constructor() {
    this.requestClient = null;
    this.signatureProvider = null;
    this.supportedTokens = {
      'ETH': {
        network: 'goerli',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18
      },
      'USDC': {
        network: 'goerli',
        address: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        decimals: 6
      },
      'DAI': {
        network: 'goerli',
        address: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        decimals: 18
      }
    };
  }

  async initialize() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      this.signatureProvider = new Web3SignatureProvider({
        provider: window.ethereum,
        signer
      });
      
      this.requestClient = new RequestNetwork({
        nodeConnectionConfig: {
          baseURL: 'https://goerli.gateway.request.network/',
        },
        signatureProvider: this.signatureProvider,
      });

      return this.requestClient;
    } catch (error) {
      console.error('Failed to initialize Request Network:', error);
      throw error;
    }
  }

  async createPaymentRequest({
    amount,
    currency = 'ETH',
    payee,
    payer,
    description,
    deadline,
    milestoneId
  }) {
    if (!this.requestClient) {
      throw new Error('Request Network client not initialized');
    }

    try {
      const tokenInfo = this.supportedTokens[currency];
      if (!tokenInfo) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      const requestCreateParameters = {
        requestInfo: {
          currency: currency === 'ETH' ? {
            type: 'ETH',
            value: tokenInfo.address,
            network: tokenInfo.network
          } : {
            type: 'ERC20',
            value: tokenInfo.address,
            network: tokenInfo.network
          },
          expectedAmount: ethers.utils.parseUnits(
            amount.toString(), 
            tokenInfo.decimals
          ).toString(),
          payee: {
            type: 'ETHEREUM_ADDRESS',
            value: payee,
          },
          payer: {
            type: 'ETHEREUM_ADDRESS',
            value: payer,
          },
          timestamp: Date.now(),
        },
        paymentNetwork: currency === 'ETH' ? {
          id: 'native-token',
          parameters: {
            paymentAddress: payee,
          },
        } : {
          id: 'erc20-proxy-contract',
          parameters: {
            paymentAddress: payee,
            tokenAddress: tokenInfo.address,
          },
        },
        contentData: {
          description,
          deadline,
          reason: 'Milestone Payment',
          milestoneId: milestoneId?.toString(),
        },
        signer: {
          type: 'ETHEREUM_ADDRESS',
          value: payee,
        },
      };

      const request = await this.requestClient.createRequest(requestCreateParameters);
      await request.waitForConfirmation();
      return request;
    } catch (error) {
      console.error('Failed to create payment request:', error);
      throw error;
    }
  }

  async getAllPaymentRequests(address) {
    if (!this.requestClient) {
      throw new Error('Request Network client not initialized');
    }

    try {
      const requests = await this.requestClient.searchRequests({
        query: {
          $or: [
            { 'requestInfo.payee.value': address.toLowerCase() },
            { 'requestInfo.payer.value': address.toLowerCase() }
          ]
        }
      });
      return requests;
    } catch (error) {
      console.error('Failed to get payment requests:', error);
      throw error;
    }
  }

  async getPaymentRequest(requestId) {
    if (!this.requestClient) {
      throw new Error('Request Network client not initialized');
    }

    try {
      const request = await this.requestClient.fromRequestId(requestId);
      return request;
    } catch (error) {
      console.error('Failed to get payment request:', error);
      throw error;
    }
  }

  async acceptPaymentRequest(requestId) {
    if (!this.requestClient) {
      throw new Error('Request Network client not initialized');
    }

    try {
      const request = await this.getPaymentRequest(requestId);
      await request.accept();
      return request;
    } catch (error) {
      console.error('Failed to accept payment request:', error);
      throw error;
    }
  }

  async cancelPaymentRequest(requestId) {
    if (!this.requestClient) {
      throw new Error('Request Network client not initialized');
    }

    try {
      const request = await this.getPaymentRequest(requestId);
      await request.cancel();
      return request;
    } catch (error) {
      console.error('Failed to cancel payment request:', error);
      throw error;
    }
  }
}

export const requestNetworkHelper = new RequestNetworkHelper();
