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
import { Upload, CheckCircle, Star } from 'lucide-react';
import { contractInteractions } from '../utils/contractInteractions';
import { ipfsHelper } from '../utils/ipfsHelper';

export default function MilestoneSubmission() {
  const { address } = useAccount();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionDetails, setSubmissionDetails] = useState('');

  useEffect(() => {
    if (address) {
      fetchMilestones();
    }
  }, [address]);

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
            isFreelancer: details.freelancer === address
          };
        })
      );

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
      
      // Generate a simple IPFS hash for demonstration
      const dummyDeliverables = {
        description: submissionDetails,
        timestamp: new Date().toISOString()
      };

      // Convert to string and create a simple hash
      const dummyHash = `ipfs-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const tx = await contractInteractions.submitMilestone(id, dummyHash);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone submitted successfully'
      });

      setSubmissionDetails('');
      await fetchMilestones();
    } catch (error) {
      console.error('Error submitting milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit milestone',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 pt-20">
      <h2 className="text-2xl font-bold mb-6">Milestone Management</h2>
      
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
                {(milestone.statusCode === 0 || milestone.statusCode === 1) && milestone.isFreelancer && (
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
                          Please provide a brief description of your work.
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
              </div>
            </CardContent>
          </Card>
        ))}

        {milestones.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No milestones found
          </div>
        )}
      </div>
    </div>
  );
} 