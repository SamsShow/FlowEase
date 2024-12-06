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
import { Plus, Clock, CheckCircle, AlertTriangle, Eye } from "lucide-react";

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
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allProjects, allMilestones] = await Promise.all([
        contractInteractions.getAllProjects(),
        contractInteractions.getAllMilestones(),
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

      // Convert deadline to Unix timestamp (seconds)
      const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);

      // Create the project
      const tx = await contractInteractions.createProject(
        newProject.title,
        newProject.description,
        newProject.budget, // Contract will handle the conversion
        deadlineTimestamp,
        [] // Empty skills array for now
      );

      // Wait for transaction to be mined
      await tx.wait();

      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      // Reset form and close modal
      setNewProject({
        title: "",
        description: "",
        budget: "",
        deadline: "",
        milestones: [{ description: "", amount: "" }],
      });
      setShowCreateModal(false);
      
      // Refresh the projects list
      await fetchData();

    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
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
      if (!newMilestone.freelancer || !newMilestone.amount || !newMilestone.description || !newMilestone.deadline) {
        throw new Error("Please fill in all milestone fields");
      }

      // Create milestone
      await contractInteractions.createMilestone(
        newMilestone.freelancer,
        ethers.parseEther(newMilestone.amount),
        newMilestone.description,
        Math.floor(new Date(newMilestone.deadline).getTime() / 1000)
      );

      toast({
        title: "Success",
        description: "Milestone created successfully"
      });

      // Add to project milestones
      setProjectMilestones(prev => [...prev, {
        ...newMilestone,
        id: Date.now(), // Temporary ID for demo
        projectId: selectedProject.id,
        status: 'pending'
      }]);

      // Reset form but keep modal open for adding more milestones
      setNewMilestone({
        freelancer: "",
        amount: "",
        description: "",
        deadline: ""
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

  const handleViewProject = async (project) => {
    setCurrentProject(project);
    // Fetch milestones for this project
    const projectMilestones = milestones.filter(m => m.projectId === project.id);
    setProjectMilestones(projectMilestones);
    setShowProjectDetailsModal(true);
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
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>Budget: {project.budget} ETH</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{project.description}</p>
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewProject(project)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {project.client === address && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setShowMilestoneModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Milestone
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                    <Badge
                      variant={
                        milestone.status === "approved"
                          ? "default"
                          : milestone.status === "in_progress"
                          ? "secondary"
                          : milestone.status === "disputed"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {milestone.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <p className="text-gray-600">{milestone.description}</p>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="font-medium">
                        {milestone.amount} ETH
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Deadline:</span>
                      <span>
                        {new Date(
                          milestone.deadline * 1000
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showProjectDetailsModal} onOpenChange={setShowProjectDetailsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{currentProject?.title}</DialogTitle>
            <DialogDescription>
              Project Details and Milestones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Budget</h4>
                <p>{currentProject?.budget} ETH</p>
              </div>
              <div>
                <h4 className="font-semibold">Deadline</h4>
                <p>{new Date(currentProject?.deadline).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <h4 className="font-semibold">Description</h4>
                <p>{currentProject?.description}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Milestones</h4>
              {projectMilestones.length > 0 ? (
                <div className="space-y-2">
                  {projectMilestones.map((milestone, index) => (
                    <Card key={milestone.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-semibold">Milestone {index + 1}</h5>
                            <p className="text-sm">{milestone.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{milestone.amount} ETH</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Freelancer: {milestone.freelancer.slice(0, 6)}...{milestone.freelancer.slice(-4)}
                          </span>
                          <Badge>{milestone.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No milestones created yet.</p>
              )}
            </div>

            {currentProject?.client === address && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setSelectedProject(currentProject);
                    setShowProjectDetailsModal(false);
                    setShowMilestoneModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Milestone
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
            <DialogDescription>
              Adding milestone for project: {selectedProject?.title}
              <br />
              Current milestones: {projectMilestones.length}
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
                onClick={() => {
                  setShowMilestoneModal(false);
                  setSelectedProject(null);
                  setProjectMilestones([]);
                }}
              >
                Done Adding
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Add Another Milestone'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Fill in the project details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter project title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your project"
                required
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget (ETH)</Label>
              <Input
                id="budget"
                type="number"
                step="0.000000000000000001"
                min="0"
                value={newProject.budget}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    budget: e.target.value,
                  }))
                }
                placeholder="0.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={newProject.deadline}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    deadline: e.target.value,
                  }))
                }
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewProject({
                    title: "",
                    description: "",
                    budget: "",
                    deadline: "",
                    milestones: [{ description: "", amount: "" }],
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExplorePage;
