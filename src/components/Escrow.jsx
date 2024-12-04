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

export default function Escrow() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (address) {
      fetchEscrows();
    }
  }, [address]);

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

          userEscrows.push({
            id: i,
            projectTitle: milestone.description,
            amount: ethers.formatEther(milestone.amount),
            freelancer: milestone.freelancer,
            client: milestone.client,
            status: getMilestoneStatus(milestone.status),
            deadline: new Date(Number(milestone.deadline) * 1000),
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Escrow Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escrows.map((escrow) => (
          <Card key={escrow.id}>
            <CardHeader>
              <CardTitle>{escrow.projectTitle}</CardTitle>
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
                  <span className="text-sm text-gray-500">
                    {escrow.isClient ? 'Freelancer:' : 'Client:'}
                  </span>
                  <span className="font-mono text-sm">
                    {escrow.isClient ? escrow.freelancer : escrow.client}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`font-semibold ${statusColors[escrow.status]}`}>
                    {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Deadline:</span>
                  <span>{escrow.deadline.toLocaleDateString()}</span>
                </div>

                {escrow.deliverables.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Deliverables:</span>
                    <div className="mt-2 space-y-2">
                      {escrow.deliverables.map((file, index) => (
                        <a
                          key={index}
                          href={`https://gateway.pinata.cloud/ipfs/${file.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-500 hover:text-blue-600"
                        >
                          {file.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {escrow.status === 'submitted' && escrow.isClient && (
                  <div className="flex gap-2 mt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1" variant="outline">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Payment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve and release the payment? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(escrow.id)}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1" variant="destructive">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Dispute
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Raise Dispute</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide details about the dispute
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 my-4">
                          <Textarea
                            placeholder="Describe the reason for dispute..."
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                          />
                          <div>
                            <label className="block text-sm mb-2">
                              Upload Evidence (optional)
                            </label>
                            <Input
                              type="file"
                              multiple
                              onChange={handleFileChange}
                              className="mb-2"
                            />
                            {selectedFiles.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {selectedFiles.length} file(s) selected
                              </div>
                            )}
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDispute(escrow.id)}>
                            Raise Dispute
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {escrows.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No escrows found
          </div>
        )}
      </div>
    </div>
  );
}
