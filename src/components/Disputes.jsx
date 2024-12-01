import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { contractInteractions } from '../utils/contractInteractions';
import { Loading } from './ui/loading';
import { toast } from './ui/use-toast';

export default function Disputes() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [voteReason, setVoteReason] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, [address]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Get all disputes
      const activeDisputes = await contract.getActiveDisputes();
      
      // Format disputes
      const formattedDisputes = await Promise.all(
        activeDisputes.map(async (dispute) => {
          const milestone = await contract.getMilestone(dispute.milestoneId);
          return {
            id: dispute.id.toString(),
            milestoneId: dispute.milestoneId.toString(),
            disputedBy: dispute.disputedBy,
            reason: dispute.reason,
            createdAt: new Date(dispute.createdAt * 1000),
            votingDeadline: new Date(dispute.votingDeadline * 1000),
            votesForFreelancer: dispute.votesForFreelancer.toString(),
            votesForClient: dispute.votesForClient.toString(),
            milestone: {
              title: milestone.description,
              amount: milestone.amount,
              freelancer: milestone.freelancer,
              client: milestone.client
            }
          };
        })
      );

      setDisputes(formattedDisputes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load disputes',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleVote = async (disputeId, voteForFreelancer) => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      const tx = await contract.voteOnDispute(disputeId, voteForFreelancer);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Vote submitted successfully'
      });
      
      await fetchDisputes();
    } catch (error) {
      console.error('Error voting on dispute:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Active Disputes</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {disputes.map((dispute) => (
          <Card key={dispute.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                Dispute #{dispute.id} - {dispute.milestone.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Disputed by</p>
                <p className="font-mono">{dispute.disputedBy}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p>{dispute.reason}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">{dispute.milestone.amount} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Voting Deadline</p>
                  <p>{dispute.votingDeadline.toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Votes for Freelancer</p>
                  <p className="font-semibold">{dispute.votesForFreelancer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Votes for Client</p>
                  <p className="font-semibold">{dispute.votesForClient}</p>
                </div>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    onClick={() => setSelectedDispute(dispute)}
                  >
                    Cast Vote
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cast Your Vote</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Explain your vote (optional)"
                      value={voteReason}
                      onChange={(e) => setVoteReason(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <Button
                        className="flex-1"
                        onClick={() => handleVote(selectedDispute.id, true)}
                      >
                        Vote for Freelancer
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => handleVote(selectedDispute.id, false)}
                      >
                        Vote for Client
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        
        {disputes.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            No active disputes found
          </div>
        )}
      </div>
    </div>
  );
} 