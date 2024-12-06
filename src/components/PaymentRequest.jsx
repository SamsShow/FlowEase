import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { toast } from './ui/use-toast'
import { requestNetworkHelper } from '../utils/requestNetworkHelper'

// Utility function for robust input validation
const validateInputs = (formData) => {
  const errors = [];

  // Validate wallet address
  if (!ethers.isAddress(formData.clientAddress)) {
    errors.push("Invalid client wallet address");
  }

  // Validate amount (positive and reasonable)
  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0 || amount > 1000000) {
    errors.push("Invalid amount. Must be between 0 and 1,000,000");
  }

  // Validate deadline (future date)
  const deadline = new Date(formData.deadline);
  const today = new Date();
  if (deadline <= today) {
    errors.push("Deadline must be a future date");
  }

  // Validate title and description length
  if (formData.title.length < 3 || formData.title.length > 100) {
    errors.push("Project title must be between 3 and 100 characters");
  }

  if (formData.description.length < 10 || formData.description.length > 500) {
    errors.push("Description must be between 10 and 500 characters");
  }

  return errors;
};

const PaymentRequest = () => {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USDC',
    clientAddress: '',
    deadline: ''
  })

  useEffect(() => {
    const initializeRequestNetwork = async () => {
      if (publicClient) {
        try {
          // Convert publicClient to ethers provider
          const provider = new ethers.BrowserProvider(window.ethereum);
          await requestNetworkHelper.initialize(provider);
        } catch (error) {
          console.error('Failed to initialize Request Network:', error);
          toast({
            title: "Initialization Error",
            description: "Failed to initialize payment system",
            variant: "destructive"
          });
        }
      }
    };

    initializeRequestNetwork();
  }, [publicClient]);

  // Token addresses with network-specific considerations
  const getTokenAddress = useCallback((currency) => {
    // Goerli testnet addresses
    const tokenAddresses = {
      USDC: "0x07865c6e87b9f70255377e024ace6630c1eaa37f", // Goerli USDC
      DAI: "0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844",  // Goerli DAI
      USDT: "0x509ee0d083ddf8ac028f2a56731412edd63223b9"  // Goerli USDT
    }
    return tokenAddresses[currency] || null
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a payment request",
        variant: "destructive"
      })
      return
    }

    // Validate inputs
    const validationErrors = validateInputs(formData)
    if (validationErrors.length > 0) {
      validationErrors.forEach(error =>
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        })
      )
      return
    }

    try {
      setLoading(true)
      
      // Get token address for the selected currency
      const tokenAddress = getTokenAddress(formData.currency)
      if (!tokenAddress) {
        throw new Error('Invalid currency selected')
      }

      // Create payment request using Request Network
      const request = await requestNetworkHelper.createPaymentRequest({
        amount: formData.amount,
        currency: tokenAddress,
        payee: address, // Current user's address (creator of request)
        payer: formData.clientAddress,
        description: `${formData.title}\n\n${formData.description}`,
        deadline: new Date(formData.deadline).getTime()
      })

      if (!request) {
        throw new Error('Failed to create payment request')
      }

      toast({
        title: "Success",
        description: "Payment request created successfully",
        variant: "default"
      })

      // Reset form
      setFormData({
        clientAddress: '',
        amount: '',
        currency: 'USDC',
        title: '',
        description: '',
        deadline: ''
      })

      // Navigate to invoice list
      navigate('/invoices')
    } catch (error) {
      console.error('Payment request creation failed:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create payment request",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection Required</h2>
        <p className="text-gray-600">Please connect your wallet to create payment requests</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Payment Request</CardTitle>
          <CardDescription>
            Create a new payment request using Request Network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter project title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the work and deliverables"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.000001"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  name="currency"
                  value={formData.currency}
                  onValueChange={(value) => handleChange({ target: { name: 'currency', value } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientAddress">Client Wallet Address</Label>
              <Input
                id="clientAddress"
                name="clientAddress"
                value={formData.clientAddress}
                onChange={handleChange}
                placeholder="0x..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Request...' : 'Create Payment Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentRequest
