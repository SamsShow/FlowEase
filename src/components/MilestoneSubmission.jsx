import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { toast } from './ui/use-toast';
import { Loading } from './ui/loading';
import { Upload, CheckCircle, Star, DollarSign } from 'lucide-react';
import { contractInteractions } from '../utils/contractInteractions';

export default function MilestoneSubmission() {
  const { address } = useAccount();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionDetails, setSubmissionDetails] = useState('');
  const [totalLockedFunds, setTotalLockedFunds] = useState(0);
  const [transactionHistory, setTransactionHistory] = useState([]);

  useEffect(() => {
    if (address) {
      fetchMilestones();
      fetchTransactionHistory();
    }
  }, [address]);

  const fetchTransactionHistory = async () => {
    try {
      // This would need to be implemented in your backend or using blockchain events
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
            amount: ethers.formatEther(details.amount),
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
          return total + parseFloat(m.amount);
        }
        return total;
      }, 0);
      
      setTotalLockedFunds(locked);
      setMilestones(milestoneDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: 'Error',
        description: 'Failed to load milestones',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (id) => {
    try {
      setLoading(true);
      
      const tx = await contractInteractions.submitMilestone(id, submissionDetails);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone submitted successfully'
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
      
      const tx = await contractInteractions.approveMilestone(id);
      await tx.wait();

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
                  <span className="font-semibold">{milestone.amount} ETH</span>
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
                          Approving this milestone will release {milestone.amount} ETH to the freelancer.
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
    </div>
  );
} 