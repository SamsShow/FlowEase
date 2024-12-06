import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { toast } from './ui/use-toast';
import { Loading } from './ui/loading';
import { Upload, CheckCircle, Star, DollarSign, FileText } from 'lucide-react';
import { contractInteractions } from '../utils/contractInteractions';
import { requestNetworkHelper } from '../utils/requestNetworkHelper';

export default function MilestoneSubmission() {
  const { address } = useAccount();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionDetails, setSubmissionDetails] = useState('');
  const [totalLockedFunds, setTotalLockedFunds] = useState(0);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  useEffect(() => {
    if (address) {
      fetchMilestones();
      fetchTransactionHistory();
    }
  }, [address]);

  const fetchTransactionHistory = async () => {
    try {
      const history = await contractInteractions.getMilestoneTransactions(address);
      setTransactionHistory(history);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const userMilestones = await contractInteractions.getUserMilestones(address);
      
      const milestoneDetails = await Promise.all(
        userMilestones.map(async (id) => {
          const details = await contractInteractions.getMilestoneDetails(id);
          return {
            id: id,
            freelancer: details.freelancer,
            client: details.client,
            amount: details.amount,
            description: details.description,
            status: details.status,
            statusCode: details.statusCode,
            deadline: new Date(Number(details.deadline) * 1000),
            isFreelancer: details.freelancer === address,
            deliverablesHash: details.deliverablesHash
          };
        })
      );

      // Calculate total locked funds
      const locked = milestoneDetails.reduce((total, m) => {
        // Only count milestones that are not approved or rejected
        if (m.statusCode !== 3 && m.statusCode !== 5) {
          return total + parseFloat(ethers.formatEther(m.amount));
        }
        return total;
      }, 0);
      
      setTotalLockedFunds(locked);
      setMilestones(milestoneDetails);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: 'Error',
        description: 'Failed to load milestones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (milestone) => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await requestNetworkHelper.initialize(provider);
      
      const invoice = await requestNetworkHelper.createPaymentRequest({
        amount: milestone.amount,
        currency: milestone.tokenAddress || 'ETH',
        payee: address,
        payer: milestone.client,
        description: `Milestone: ${milestone.description}\n\nSubmission Details: ${submissionDetails}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime()
      });

      if (!invoice) {
        throw new Error('Failed to create invoice');
      }

      toast({
        title: "Success",
        description: "Invoice created successfully",
        variant: "default"
      });

      setShowInvoiceDialog(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (id) => {
    try {
      if (!submissionDetails.trim()) {
        toast({
          title: "Error",
          description: "Please provide submission details",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      const milestone = milestones.find(m => m.id === id);
      if (!milestone) throw new Error('Milestone not found');

      // First submit the milestone to the contract
      const tx = await contractInteractions.submitMilestone(id, submissionDetails);
      await tx.wait();

      // Then create the work submission invoice
      const provider = new ethers.BrowserProvider(window.ethereum);
      await requestNetworkHelper.initialize(provider);
      
      const submissionInvoice = await requestNetworkHelper.createPaymentRequest({
        amount: milestone.amount,
        currency: 'ETH',
        payee: address, // freelancer
        payer: milestone.client,
        description: `Milestone Work Submission - ${milestone.description}\n\nDeliverables: ${submissionDetails}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime()
      });

      if (!submissionInvoice) {
        throw new Error('Failed to create submission invoice');
      }

      toast({
        title: 'Success',
        description: 'Milestone submitted and invoice created'
      });

      setSubmissionDetails('');
      await fetchMilestones();
      await fetchTransactionHistory();
    } catch (error) {
      console.error('Error submitting milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit milestone',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMilestone = async (id) => {
    try {
      setLoading(true);
      
      // First approve the milestone in the contract
      const tx = await contractInteractions.approveMilestone(id);
      await tx.wait();

      // Then create the completion invoice
      const milestone = milestones.find(m => m.id === id);
      if (!milestone) throw new Error('Milestone not found');

      // Initialize Request Network
      await requestNetworkHelper.initialize();
      
      const completionInvoice = await requestNetworkHelper.createPaymentRequest({
        amount: ethers.utils.formatEther(milestone.amount),
        currency: 'ETH',
        payee: milestone.freelancer,
        payer: address,
        description: `Milestone Completion - ${milestone.description}\n\nDelivery: ${milestone.deliverablesHash}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(),
        milestoneId: id
      });

      if (!completionInvoice) {
        throw new Error('Failed to create completion invoice');
      }

      toast({
        title: 'Success',
        description: 'Milestone approved and payment sent to freelancer'
      });

      await fetchMilestones();
      await fetchTransactionHistory();
    } catch (error) {
      console.error('Error approving milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve milestone',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 pt-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Milestone Management</h2>
        <div className="mt-2 p-4 bg-secondary rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Locked Funds:</span>
            <span className="font-bold">{totalLockedFunds.toFixed(4)} ETH</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((milestone) => (
          <Card key={milestone.id}>
            <CardHeader>
              <CardTitle>{milestone.description}</CardTitle>
              <CardDescription>
                {milestone.isFreelancer ? 'You are the freelancer' : 'You are the client'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount:</span>
                  <span className="font-semibold">{ethers.formatEther(milestone.amount)} ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  <Badge>{milestone.status}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Deadline:</span>
                  <span>{milestone.deadline.toLocaleDateString()}</span>
                </div>

                {/* Submit Work Button (for Freelancer) */}
                {milestone.statusCode === 1 && milestone.isFreelancer && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Work
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Milestone</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide details of your completed work
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 my-4">
                        <Textarea
                          placeholder="Describe your work..."
                          value={submissionDetails}
                          onChange={(e) => setSubmissionDetails(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedMilestone(milestone);
                            setShowInvoiceDialog(true);
                          }}
                          className="w-full mt-2"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Create Invoice
                        </Button>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSubmitMilestone(milestone.id)}
                          disabled={!submissionDetails.trim()}
                        >
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Approve Button (for Client) */}
                {milestone.statusCode === 2 && !milestone.isFreelancer && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Pay
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Milestone</AlertDialogTitle>
                        <AlertDialogDescription>
                          Approving this milestone will release {ethers.formatEther(milestone.amount)} ETH to the freelancer.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      {milestone.deliverablesHash && (
                        <div className="my-4">
                          <h4 className="font-medium mb-2">Submitted Work:</h4>
                          <p className="text-sm">{milestone.deliverablesHash}</p>
                        </div>
                      )}
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleApproveMilestone(milestone.id)}
                        >
                          Approve & Pay
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Payment Status for Completed Milestones */}
                {milestone.statusCode === 3 && (
                  <div className="flex items-center justify-center p-2 bg-green-50 rounded-md">
                    <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600">Payment Released</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction History Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Transaction History</h3>
        <div className="space-y-4">
          {transactionHistory.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{tx.type}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{tx.amount} ETH</p>
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      View on Etherscan
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {transactionHistory.length === 0 && (
            <p className="text-center text-gray-500">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Invoice Creation Dialog */}
      <AlertDialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Create an invoice for milestone submission
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={submissionDetails}
                onChange={(e) => setSubmissionDetails(e.target.value)}
                placeholder="Describe the work completed..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMilestone && handleCreateInvoice(selectedMilestone)}
              disabled={loading || !submissionDetails.trim()}
            >
              Create Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 