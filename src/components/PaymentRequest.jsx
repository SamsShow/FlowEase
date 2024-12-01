import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { ethers } from 'ethers'
import { toast } from './ui/use-toast'

export default function PaymentRequest() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'ETH',
    deadline: '',
    clientAddress: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }
  
    setLoading(true)
    try {
      const deadlineDate = new Date(formData.deadline).getTime() / 1000
      
      const tokenAddress = getTokenAddress(formData.currency)
  
      const decimals = formData.currency === 'ETH' ? 18 : 6
      const parsedAmount = ethers.utils.parseUnits(formData.amount.toString(), decimals)
  
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      
      const contractAddress = "YOUR_CONTRACT_ADDRESS"
      const contractABI = []
      
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      )
  
      const tx = await contract.createMilestone(
        formData.clientAddress,
        tokenAddress,
        parsedAmount,
        formData.description,
        deadlineDate
      )
  
      await tx.wait()
  
      toast({
        title: "Success",
        description: "Payment request created successfully!",
      })
  
      navigate('/dashboard')
    } catch (error) {
      console.error('Error creating payment request:', error)
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

  // Helper function to get token address based on currency
  const getTokenAddress = (currency) => {
    // Replace these with actual token addresses from your config
    const tokenAddresses = {
      ETH: "0x0000000000000000000000000000000000000000", // Native ETH
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on mainnet
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F" // DAI on mainnet
    }
    return tokenAddresses[currency]
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Please connect your wallet</h2>
        <p className="text-gray-600">You need to connect your wallet to create payment requests</p>
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
