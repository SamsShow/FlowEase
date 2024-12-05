import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Textarea } from './ui/textarea'
import { CheckCircle, XCircle, AlertTriangle, Upload } from 'lucide-react'
import { contractInteractions } from '../utils/contractInteractions'
import { ipfsHelper } from '../utils/ipfsHelper'
import { toast } from './ui/use-toast'
import { Loading } from './ui/loading'
import { Input } from './ui/input'

export default function Escrow() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submissionDetails, setSubmissionDetails] = useState('');
  const [voteForFreelancer, setVoteForFreelancer] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [submissionData, setSubmissionData] = useState({
    milestoneId: null,
    description: '',
    files: []
  });
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  useEffect(() => {
    if (address) {
      fetchEscrows();
      fetchUserProfile();
    }
  }, [address]);

  useEffect(() => {
    console.log('Current escrows:', escrows);
  }, [escrows]);

  const fetchEscrows = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Get all milestones for the user (both as client and freelancer)
      const milestoneCount = await contract.milestoneCounter();
      const userEscrows = [];

      for (let i = 1; i <= milestoneCount; i++) {
        const milestone = await contract.milestones(i);
        if (milestone.client === address || milestone.freelancer === address) {
          // Get IPFS data if available
          let ipfsData = {};
          if (milestone.deliverablesHash) {
            ipfsData = await ipfsHelper.getContent(milestone.deliverablesHash);
          }

          const deadline = new Date(Number(milestone.deadline) * 1000);
          const isValidDate = !isNaN(deadline);

          userEscrows.push({
            id: i,
            projectTitle: milestone.description,
            amount: ethers.formatEther(milestone.amount),
            freelancer: milestone.freelancer,
            client: milestone.client,
            status: getMilestoneStatus(milestone.status),
            deadline: isValidDate ? deadline.toLocaleDateString() : 'No Deadline',
            deliverables: ipfsData.deliverables || [],
            isClient: milestone.client === address
          });
        }
      }

      setEscrows(userEscrows);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching escrows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escrows',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const profile = await contractInteractions.getUserProfile(address);
      
      // Check if profile exists and has all required properties
      if (profile && Array.isArray(profile) && profile.length >= 7) {
        setUserProfile({
          ipfsHash: profile[0] || '',
          profileImage: profile[1] || '',
          totalJobs: profile[2] ? profile[2].toString() : '0',
          completedJobs: profile[3] ? profile[3].toString() : '0',
          averageRating: profile[4] ? (profile[4] / 100).toFixed(2) : '0.00',
          isVerified: profile[5] || false,
          reviewCount: profile[6] ? profile[6].toString() : '0'
        });
      } else {
        // Set default values if profile doesn't exist
        setUserProfile({
          ipfsHash: '',
          profileImage: '',
          totalJobs: '0',
          completedJobs: '0',
          averageRating: '0.00',
          isVerified: false,
          reviewCount: '0'
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set default values on error
      setUserProfile({
        ipfsHash: '',
        profileImage: '',
        totalJobs: '0',
        completedJobs: '0',
        averageRating: '0.00',
        isVerified: false,
        reviewCount: '0'
      });
    }
  };

  const handleUpdateProfile = async (ipfsHash, profileImage) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.updateProfile(ipfsHash, profileImage);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });

      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleAddReview = async (reviewed, milestoneId) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.addReview(
        reviewed,
        reviewData.rating,
        reviewData.comment,
        milestoneId
      );
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Review submitted successfully'
      });

      setReviewData({ rating: 5, comment: '' });
      await fetchEscrows();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const getMilestoneStatus = (statusCode) => {
    const statuses = {
      0: 'pending',
      1: 'in_progress',
      2: 'submitted',
      3: 'approved',
      4: 'disputed',
      5: 'rejected'
    };
    return statuses[statusCode] || 'unknown';
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.releaseMilestone(id);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Payment released successfully'
      });

      await fetchEscrows();
    } catch (error) {
      console.error('Error approving milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to release payment',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleDispute = async (id) => {
    try {
      if (!disputeReason.trim()) {
        throw new Error('Please provide a reason for the dispute');
      }

      setLoading(true);
      
      // Upload dispute details to IPFS
      const disputeData = {
        reason: disputeReason,
        evidence: [],
        timestamp: new Date().toISOString()
      };

      // Upload any evidence files
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(file => 
          ipfsHelper.uploadFile(file)
        );
        const fileHashes = await Promise.all(uploadPromises);
        disputeData.evidence = fileHashes;
      }

      const ipfsHash = await ipfsHelper.uploadMetadata(
        disputeData,
        `dispute-${id}`
      );

      // Create dispute on-chain
      const tx = await contractInteractions.disputeEscrow(id, ipfsHash);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Dispute raised successfully'
      });

      setDisputeReason('');
      setSelectedFiles([]);
      await fetchEscrows();
    } catch (error) {
      console.error('Error raising dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to raise dispute',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleSubmitMilestone = async (id) => {
    try {
      setLoading(true);
      
      // Validate inputs
      if (!submissionDetails.trim()) {
        throw new Error("Please provide submission details");
      }
      if (selectedFiles.length === 0) {
        throw new Error("Please upload at least one deliverable");
      }

      // Upload files to IPFS first
      const uploadPromises = selectedFiles.map(file => 
        ipfsHelper.uploadFile(file)
      );
      const fileHashes = await Promise.all(uploadPromises);
      
      // Create deliverables metadata
      const deliverablesData = {
        description: submissionDetails,
        files: fileHashes.map((hash, index) => ({
          name: selectedFiles[index].name,
          hash: hash,
          type: selectedFiles[index].type,
          size: selectedFiles[index].size
        })),
        timestamp: new Date().toISOString()
      };

      // Upload metadata to IPFS
      const ipfsHash = await ipfsHelper.uploadMetadata(
        deliverablesData,
        `milestone-${id}`
      );

      // Submit milestone on-chain
      const tx = await contractInteractions.submitMilestone(id, ipfsHash);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone submitted successfully'
      });

      // Update local state
      setEscrows(prev => prev.map(escrow => 
        escrow.id === id 
          ? { 
              ...escrow, 
              status: 'submitted',
              deliverables: deliverablesData.files
            }
          : escrow
      ));

      // Reset form
      setSubmissionDetails('');
      setSelectedFiles([]);
      
      await fetchEscrows();
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
      
      // Get milestone details first
      const milestone = escrows.find(e => e.id === id);
      if (!milestone) {
        throw new Error("Milestone not found");
      }

      // Only client can approve
      if (!milestone.isClient) {
        throw new Error("Only the client can approve milestones");
      }

      // Approve milestone and release payment
      const tx = await contractInteractions.approveMilestone(id);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone approved and payment released'
      });

      // Update local state
      setEscrows(prev => prev.map(escrow => 
        escrow.id === id 
          ? { ...escrow, status: 'approved' }
          : escrow
      ));

      await fetchEscrows();
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

  const handleVoteOnDispute = async (disputeId) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.voteOnDispute(disputeId, voteForFreelancer);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Vote submitted successfully'
      });

      await fetchEscrows();
    } catch (error) {
      console.error('Error voting on dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.resolveDispute(disputeId);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Dispute resolved successfully'
      });

      await fetchEscrows();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve dispute',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSubmitWork = async () => {
    try {
      setLoading(true);
      
      if (!submissionData.description.trim()) {
        throw new Error("Please provide submission details");
      }
      if (submissionData.files.length === 0) {
        throw new Error("Please upload at least one file");
      }

      // Upload files to IPFS
      const uploadPromises = submissionData.files.map(file => 
        ipfsHelper.uploadFile(file)
      );
      const fileHashes = await Promise.all(uploadPromises);

      // Create submission metadata
      const submissionMetadata = {
        description: submissionData.description,
        files: fileHashes.map((hash, index) => ({
          name: submissionData.files[index].name,
          hash: hash,
          type: submissionData.files[index].type,
          size: submissionData.files[index].size
        })),
        timestamp: new Date().toISOString()
      };

      // Upload metadata to IPFS
      const ipfsHash = await ipfsHelper.uploadMetadata(
        submissionMetadata,
        `milestone-${submissionData.milestoneId}`
      );

      // Submit to blockchain
      const contract = await contractInteractions.getContract();
      const tx = await contract.submitMilestoneDeliverable(
        submissionData.milestoneId,
        ipfsHash
      );
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Work submitted successfully'
      });

      // Reset form and refresh data
      setSubmissionData({
        milestoneId: null,
        description: '',
        files: []
      });
      setShowSubmissionDialog(false);
      await fetchEscrows();

    } catch (error) {
      console.error('Error submitting work:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit work',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'text-yellow-500',
    in_progress: 'text-blue-500',
    submitted: 'text-purple-500',
    approved: 'text-green-500',
    disputed: 'text-red-500',
    rejected: 'text-gray-500'
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 pt-20">
      <h2 className="text-2xl font-bold mb-6">Escrow Management</h2>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p>Total Escrows: {escrows.length}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escrows.map((escrow) => (
          <Card key={escrow.id} className="relative">
            <CardHeader>
              <CardTitle>
                Milestone #{escrow.id}: {escrow.projectTitle}
              </CardTitle>
              <CardDescription>
                {escrow.isClient ? 'You are the client' : 'You are the freelancer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount:</span>
                  <span className="font-semibold">{escrow.amount} ETH</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`font-semibold ${statusColors[escrow.status]}`}>
                    {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Deadline:</span>
                  <span>{escrow.deadline}</span>
                </div>

                {!escrow.isClient && escrow.status === 'in_progress' && (
                  <Button
                    className="w-full mt-4 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      console.log('Opening submission dialog for milestone:', escrow.id);
                      setSubmissionData(prev => ({
                        ...prev,
                        milestoneId: escrow.id
                      }));
                      setShowSubmissionDialog(true);
                    }}
                  >
                    Submit Work for Milestone #{escrow.id}
                  </Button>
                )}

                {escrow.deliverables && escrow.deliverables.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Current Deliverables:</h4>
                    <ul className="text-sm space-y-1">
                      {escrow.deliverables.map((file, index) => (
                        <li key={index} className="text-blue-500 hover:text-blue-600">
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${file.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {file.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {escrows.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No milestones found. Create a new project to get started.
          </div>
        )}
      </div>

      <AlertDialog 
        open={showSubmissionDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setSubmissionData({
              milestoneId: null,
              description: '',
              files: []
            });
          }
          setShowSubmissionDialog(open);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Submit Work for Milestone #{submissionData.milestoneId}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please provide details about your work and upload any relevant files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                placeholder="Describe your work and any specific details..."
                value={submissionData.description}
                onChange={(e) => setSubmissionData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Files
              </label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSubmissionData(prev => ({
                    ...prev,
                    files: [...prev.files, ...files]
                  }));
                }}
                className="mb-2"
              />
              
              {submissionData.files.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                  <ul className="text-sm space-y-1">
                    {submissionData.files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span className="truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSubmissionData(prev => ({
                              ...prev,
                              files: prev.files.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitWork}
              disabled={!submissionData.description.trim() || submissionData.files.length === 0}
            >
              Submit Work
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
