import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { contractInteractions } from "../../utils/contractInteractions";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { toast } from "../ui/use-toast";
import { SearchFilter } from "../Search/SearchFilter";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Plus, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const ExplorePage = () => {
  const { address } = useAccount();
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filteredMilestones, setFilteredMilestones] = useState([]);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    milestones: [{ description: "", amount: "" }],
  });
  const [newMilestone, setNewMilestone] = useState({
    freelancer: "",
    amount: "",
    description: "",
    deadline: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allProjects, allMilestones] = await Promise.all([
        contractInteractions.getAllProjects(),
        contractInteractions.getAllMilestones()
      ]);

      // Process projects
      const uniqueProjects = Array.from(
        new Map(allProjects.map((project) => [project.id, project])).values()
      );
      const sortedProjects = uniqueProjects.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      // Process milestones
      const sortedMilestones = allMilestones.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      setProjects(sortedProjects);
      setFilteredProjects(sortedProjects);
      setMilestones(sortedMilestones);
      setFilteredMilestones(sortedMilestones);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate inputs
      if (
        !newProject.title ||
        !newProject.description ||
        !newProject.budget ||
        !newProject.deadline
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Validate budget is a positive number
      const budgetNum = parseFloat(newProject.budget);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        throw new Error("Please enter a valid budget amount");
      }

      // Validate deadline is in the future
      const deadlineDate = new Date(newProject.deadline);
      if (deadlineDate <= new Date()) {
        throw new Error("Deadline must be in the future");
      }

      const confirmCreate = window.confirm(
        "Are you sure you want to create this project? You'll need to confirm the transaction in MetaMask."
      );

      if (!confirmCreate) {
        setLoading(false);
        return;
      }

      try {
        // Create the project
        await contractInteractions.createProject(
          newProject.title,
          newProject.description,
          budgetNum.toString(),
          deadlineDate,
          [] // Empty skills array for now
        );

        toast({
          title: "Success",
          description: "Project created successfully!",
        });

        setShowCreateModal(false);
        await fetchData();

        // Reset form
        setNewProject({
          title: "",
          description: "",
          budget: "",
          deadline: "",
          milestones: [{ description: "", amount: "" }],
        });
      } catch (txError) {
        console.error("Transaction error:", txError);
        throw new Error(
          txError.message ||
            "Transaction failed. Please check your wallet has sufficient funds."
        );
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    const filtered = projects.filter(
      (project) =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  };

  const handleFilter = (filters) => {
    let filtered = [...projects];

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(
        (project) => project.status === filters.status
      );
    }

    // Budget filter
    if (filters.amount !== "all") {
      const [min, max] = filters.amount.split("-").map(Number);
      filtered = filtered.filter((project) => {
        const budget = Number(project.budget);
        return max ? budget >= min && budget <= max : budget >= min;
      });
    }

    setFilteredProjects(filtered);
  };

  const addMilestone = () => {
    setNewProject((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { description: "", amount: "" }],
    }));
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate inputs
      if (!newMilestone.freelancer || !newMilestone.amount || 
          !newMilestone.description || !newMilestone.deadline) {
        throw new Error("Please fill in all required fields");
      }

      // Validate amount is positive
      const amount = ethers.parseEther(newMilestone.amount);
      if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      // Validate deadline is in the future
      const deadlineDate = new Date(newMilestone.deadline);
      if (deadlineDate <= new Date()) {
        throw new Error("Deadline must be in the future");
      }

      const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);

      console.log('Creating milestone with params:', {
        freelancer: newMilestone.freelancer,
        amount: amount.toString(),
        deadline: deadlineTimestamp,
        description: newMilestone.description
      });

      // Create milestone with exact ETH value
      const tx = await contractInteractions.createMilestone(
        newMilestone.freelancer,
        amount,
        newMilestone.description,
        deadlineTimestamp
      );

      await tx.wait();

      toast({
        title: "Success",
        description: "Milestone created successfully!"
      });

      setShowCreateModal(false);
      await fetchData();
      
      // Reset form
      setNewMilestone({
        freelancer: '',
        amount: '',
        description: '',
        deadline: ''
      });
    } catch (error) {
      console.error("Error creating milestone:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create milestone",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading projects...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Explore</h1>
        <div className="space-x-4">
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Project
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <SearchFilter onSearch={handleSearch} onFilter={handleFilter} />
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMilestones.map((milestone) => (
              <Card key={milestone.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Milestone #{milestone.id}</CardTitle>
                      <CardDescription>
                        Freelancer: {milestone.freelancer.slice(0, 6)}...
                        {milestone.freelancer.slice(-4)}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      milestone.status === 'approved' ? 'default' :
                      milestone.status === 'in_progress' ? 'secondary' :
                      milestone.status === 'disputed' ? 'destructive' :
                      'outline'
                    }>
                      {milestone.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <p className="text-gray-600">{milestone.description}</p>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="font-medium">{milestone.amount} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Deadline:</span>
                      <span>{new Date(milestone.deadline * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
            <DialogDescription>
              Create a new milestone for a project
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div>
              <Label htmlFor="freelancer">Freelancer Address</Label>
              <Input
                id="freelancer"
                value={newMilestone.freelancer}
                onChange={(e) =>
                  setNewMilestone((prev) => ({
                    ...prev,
                    freelancer: e.target.value,
                  }))
                }
                placeholder="0x..."
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                step="0.000000000000000001"
                value={newMilestone.amount}
                onChange={(e) =>
                  setNewMilestone((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newMilestone.description}
                onChange={(e) =>
                  setNewMilestone((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={newMilestone.deadline}
                onChange={(e) =>
                  setNewMilestone((prev) => ({
                    ...prev,
                    deadline: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Milestone"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for project cards
const ProjectCard = ({ project }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>
            Posted by: {project.client.slice(0, 6)}...
            {project.client.slice(-4)}
          </CardDescription>
        </div>
        <Badge
          variant={
            project.status === "open"
              ? "default"
              : project.status === "in_progress"
              ? "secondary"
              : "outline"
          }
        >
          {project.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col">
      <p className="text-gray-600 mb-4 flex-1">{project.description}</p>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Budget:</span>
          <span className="font-medium">{project.budget} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Deadline:</span>
          <span>
            {new Date(project.deadline * 1000).toLocaleDateString()}
          </span>
        </div>
        <Button
          className="w-full mt-4"
          variant="outline"
          onClick={() => {}}
        >
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default ExplorePage;
