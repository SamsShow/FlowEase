import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Textarea } from './ui/textarea'
import { CheckCircle, XCircle, AlertTriangle, Upload, FileText } from 'lucide-react'
import { contractInteractions } from '../utils/contractInteractions'
import { ipfsHelper } from '../utils/ipfsHelper'
import { requestNetworkHelper } from '../utils/requestNetworkHelper'
import { toast } from './ui/use-toast'
import { Loading } from './ui/loading'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'

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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USDC'
  });

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
          if (milestone.deliverablesHash && milestone.deliverablesHash !== '') {
            try {
              ipfsData = await ipfsHelper.getContent(milestone.deliverablesHash);
              console.log('IPFS Data for milestone', i, ':', ipfsData);
            } catch (ipfsError) {
              console.warn('Failed to fetch IPFS data for milestone', i, ':', ipfsError);
              ipfsData = {}; // Use empty object if IPFS fetch fails
            }
          }

          const deadline = new Date(Number(milestone.deadline) * 1000);
          const isValidDate = !isNaN(deadline);

          userEscrows.push({
            id: i,
            projectTitle: milestone.description,
            amount: milestone.amount,
            freelancer: milestone.freelancer,
            client: milestone.client,
            status: getMilestoneStatus(milestone.status),
            statusCode: milestone.status,
            deadline: isValidDate ? deadline.toLocaleDateString() : 'No Deadline',
            deliverables: ipfsData.deliverables || [],
            isClient: milestone.client === address,
            deliverablesHash: milestone.deliverablesHash || ''
          });
        }
      }

      console.log('Fetched escrows:', userEscrows);
      setEscrows(userEscrows);
    } catch (error) {
      console.error('Error fetching escrows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escrows',
        variant: 'destructive'
      });
    } finally {
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
      0: 'PENDING_START',
      1: 'IN_PROGRESS',
      2: 'SUBMITTED',
      3: 'COMPLETED',
      4: 'DISPUTED',
      5: 'CANCELLED'
    };
    return statuses[statusCode] || 'UNKNOWN';
  };

  const handleCreateInvoice = async (escrow) => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await requestNetworkHelper.initialize(provider);
      
      const invoice = await requestNetworkHelper.createPaymentRequest({
        amount: escrow.amount,
        currency: escrow.tokenAddress,
        payee: escrow.freelancer,
        payer: address,
        description: `Escrow Payment - ${escrow.title}\n\n${escrow.description}`,
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

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      const escrowDetails = escrows.find(e => e.id === id);
      if (!escrowDetails) throw new Error('Escrow details not found');

      // Create invoice first
      await handleCreateInvoice(escrowDetails);

      // Then approve escrow
      await contractInteractions.approveEscrow(id);
      
      toast({
        title: "Success",
        description: "Escrow approved and invoice created",
        variant: "default"
      });
      
      await fetchEscrows();
    } catch (error) {
      console.error('Error approving escrow:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve escrow",
        variant: "destructive"
      });
    } finally {
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

  const handleSubmitWork = async (milestoneId) => {
    try {
      setLoading(true);
      
      // First upload files to IPFS if any
      let ipfsHash = '';
      if (selectedFiles.length > 0) {
        ipfsHash = await ipfsHelper.uploadMilestoneDeliverables(
          { id: milestoneId, description: submissionDetails },
          selectedFiles
        );
      }

      // Submit work to contract
      const tx = await contractInteractions.submitMilestone(milestoneId, ipfsHash);
      await tx.wait();

      // Create submission invoice
      const milestone = escrows.find(e => e.id === milestoneId);
      if (!milestone) throw new Error('Milestone not found');

      // Initialize Request Network
      await requestNetworkHelper.initialize();
      
      const submissionInvoice = await requestNetworkHelper.createPaymentRequest({
        amount: ethers.utils.formatEther(milestone.amount),
        currency: 'ETH',
        payee: address, // freelancer
        payer: milestone.client,
        description: `Milestone Work Submission - ${milestone.projectTitle}\n\nDeliverables: ${submissionDetails}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(),
        milestoneId: milestoneId
      });

      if (!submissionInvoice) {
        throw new Error('Failed to create submission invoice');
      }

      toast({
        title: 'Success',
        description: 'Work submitted successfully'
      });

      setSelectedFiles([]);
      setSubmissionDetails('');
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

  const handleCreateMilestone = async (formData) => {
    try {
      setLoading(true);
      
      // First create the milestone in the contract
      const tx = await contractInteractions.createMilestone(
        formData.freelancer,
        formData.amount,
        formData.description,
        formData.deadline
      );
      await tx.wait();

      // Then create the escrow funding invoice
      const provider = new ethers.BrowserProvider(window.ethereum);
      await requestNetworkHelper.initialize(provider);
      
      const fundingInvoice = await requestNetworkHelper.createPaymentRequest({
        amount: formData.amount,
        currency: 'ETH',
        payee: formData.freelancer,
        payer: address,
        description: `Milestone Escrow Funding\n\nDescription: ${formData.description}\nDeadline: ${new Date(formData.deadline).toLocaleDateString()}`,
        deadline: formData.deadline
      });

      if (!fundingInvoice) {
        throw new Error('Failed to create funding invoice');
      }

      toast({
        title: 'Success',
        description: 'Milestone created and funded successfully'
      });

      await fetchEscrows();
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create milestone',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartMilestone = async (id) => {
    try {
      setLoading(true);
      const tx = await contractInteractions.startMilestone(id);
      await tx.wait();

      // Create milestone start invoice
      const milestone = escrows.find(e => e.id === id);
      if (!milestone) throw new Error('Milestone not found');

      // Initialize Request Network with proper provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await requestNetworkHelper.initialize(provider);
      
      const startInvoice = await requestNetworkHelper.createPaymentRequest({
        amount: ethers.formatEther(milestone.amount),
        currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f', // Goerli USDC
        payee: milestone.freelancer,
        payer: address,
        description: `Milestone Started - ${milestone.projectTitle}\n\nEscrow Amount Locked`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime()
      });

      if (!startInvoice) {
        throw new Error('Failed to create start invoice');
      }

      toast({
        title: 'Success',
        description: 'Milestone started successfully'
      });

      await fetchEscrows();
    } catch (error) {
      console.error('Error starting milestone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start milestone',
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Escrow Management</h2>
      
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
                  <span className="font-semibold">{ethers.formatEther(escrow.amount)} ETH</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  <Badge>{escrow.status}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Deadline:</span>
                  <span>{escrow.deadline}</span>
                </div>

                {/* Show Start button for client when status is PENDING_START */}
                {escrow.status === 'PENDING_START' && escrow.isClient && (
                  <Button
                    className="w-full"
                    onClick={() => handleStartMilestone(escrow.id)}
                    disabled={loading}
                  >
                    Start Milestone
                  </Button>
                )}

                {/* Submit Work Button (for Freelancer) */}
                {escrow.status === 'IN_PROGRESS' && !escrow.isClient && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Work
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Work</AlertDialogTitle>
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
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSubmitWork(escrow.id)}
                          disabled={loading || !submissionDetails.trim()}
                        >
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Show deliverables if available */}
                {escrow.deliverables && escrow.deliverables.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Deliverables:</h4>
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
      </div>
    </div>
  );
}
