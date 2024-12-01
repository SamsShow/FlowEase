import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { toast } from './ui/use-toast'
import { contractInteractions } from '../utils/contractInteractions'

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
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'ETH',
    clientAddress: '',
    deadline: ''
  })

  // Token addresses with network-specific considerations
  const getTokenAddress = useCallback((currency) => {
    const tokenAddresses = {
      ETH: "0x0000000000000000000000000000000000000000", // Native ETH
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum mainnet
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI on Ethereum mainnet
    }
    return tokenAddresses[currency] || null
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Initial connection check
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

    setLoading(true)
    try {
      // Robust deadline conversion
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000)
      
      // Dynamic decimal handling
      const decimals = formData.currency === 'ETH' ? 18 : 
                       formData.currency === 'USDC' ? 6 : 
                       formData.currency === 'DAI' ? 18 : 18

      // Safe parsing of amount
      const parsedAmount = ethers.parseUnits(formData.amount.toString(), decimals)
      const tokenAddress = getTokenAddress(formData.currency)

      // Retrieve contract with error handling
      const contract = await contractInteractions.getContract()
      if (!contract) {
        throw new Error("Unable to initialize contract. Please check your network connection.")
      }

      // Comprehensive transaction parameters
      const transactionParams = {
        freelancer: formData.clientAddress,
        tokenAddress: tokenAddress,
        amount: parsedAmount,
        description: formData.description,
        deadline: deadlineTimestamp,
        ...(formData.currency === 'ETH' ? { value: parsedAmount } : {})
      }

      console.log('Creating milestone with params:', transactionParams)

      // Gas estimation with error handling
      let gasEstimate;
      try {
        gasEstimate = await contract.createMilestone.estimateGas(
          transactionParams.freelancer,
          transactionParams.tokenAddress,
          transactionParams.amount,
          transactionParams.description,
          transactionParams.deadline,
          { value: transactionParams.value || 0 }
        )
      } catch (estimationError) {
        console.error('Gas estimation failed:', estimationError)
        throw new Error('Unable to estimate gas. Transaction might fail.')
      }

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(gasEstimate * 1.2)

      // Execute transaction
      const tx = await contract.createMilestone(
        transactionParams.freelancer,
        transactionParams.tokenAddress,
        transactionParams.amount,
        transactionParams.description,
        transactionParams.deadline,
        { 
          value: transactionParams.value || 0,
          gasLimit 
        }
      )

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      toast({
        title: "Success",
        description: "Payment request created successfully!",
        variant: "default"
      })

      // Navigate to dashboard
      navigate('/dashboard')

    } catch (error) {
      console.error('Transaction Error:', error)
      
      // Comprehensive error handling
      const errorMessage = error.reason || 
        error.message || 
        "An unexpected error occurred during payment request creation"

      toast({
        title: "Transaction Failed",
        description: errorMessage,
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
            Create a new payment request for your freelance work
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
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientAddress">Client's Wallet Address</Label>
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
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Request...' : 'Create Payment Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentRequest
