import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, CheckCircle2, Clock, AlertCircle, Upload } from 'lucide-react';
import { contractInteractions } from '../utils/contractInteractions';
import { ipfsHelper } from '../utils/ipfsHelper';
import { Loading } from './ui/loading';
import { toast } from './ui/use-toast';

const statusIcons = {
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  'in-progress': <Clock className="w-5 h-5 text-yellow-500" />,
  disputed: <AlertCircle className="w-5 h-5 text-red-500" />
};

export default function Milestones() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchMilestones();
    }
  }, [projectId, address]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Get milestone details
      const milestone = await contract.getMilestone(projectId);
      
      // Get any deliverables from IPFS if they exist
      let deliverables = [];
      if (milestone.deliverablesHash) {
        const ipfsData = await ipfsHelper.getContent(milestone.deliverablesHash);
        deliverables = ipfsData.deliverables || [];
      }

      setMilestones([{
        id: milestone.id.toString(),
        title: milestone.description,
        amount: milestone.amount,
        deadline: new Date(milestone.deadline * 1000),
        status: milestone.status.toLowerCase(),
        freelancer: milestone.freelancer,
        client: milestone.client,
        deliverables
      }]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: 'Error',
        description: 'Failed to load milestone data',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneId) => {
    try {
      setLoading(true);
      
      // Upload deliverables to IPFS if any
      let deliverablesHash = '';
      if (selectedFiles.length > 0) {
        deliverablesHash = await ipfsHelper.uploadMilestoneDeliverables(
          { id: milestoneId },
          selectedFiles
        );
      }

      // Submit milestone
      const contract = await contractInteractions.getContract();
      const tx = await contract.submitMilestone(milestoneId, deliverablesHash);
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone submitted successfully'
      });

      await fetchMilestones();
    } catch (error) {
      console.error('Error submitting milestone:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit milestone',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Convert deadline to Unix timestamp
      const deadlineDate = new Date(newMilestone.deadline).getTime() / 1000;
      
      const tx = await contract.createMilestone(
        address,
        "0x0000000000000000000000000000000000000000", // ETH
        contractInteractions.parseAmount(newMilestone.amount),
        newMilestone.description,
        deadlineDate
      );
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Milestone created successfully'
      });

      await fetchMilestones();
      setNewMilestone({ title: '', description: '', amount: '', deadline: '' });
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast({
        title: 'Error',
        description: 'Failed to create milestone',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Project Milestones</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Milestone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                  placeholder="Milestone title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                  placeholder="Describe the deliverables"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newMilestone.amount}
                    onChange={(e) => setNewMilestone({...newMilestone, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newMilestone.deadline}
                    onChange={(e) => setNewMilestone({...newMilestone, deadline: e.target.value})}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Create Milestone</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className="relative">
            <div className="absolute top-4 right-4">
              {statusIcons[milestone.status]}
            </div>
            <CardHeader>
              <CardTitle>{milestone.title}</CardTitle>
              <CardDescription>Due: {milestone.deadline.toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">{milestone.amount} ETH</p>
                </div>

                {milestone.deliverables.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Deliverables</p>
                    <div className="space-y-2">
                      {milestone.deliverables.map((file, index) => (
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

                {milestone.status === 'in-progress' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="files">Upload Deliverables</Label>
                      <Input
                        id="files"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleSubmitMilestone(milestone.id)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Submit for Review
                    </Button>
                  </div>
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
