import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { contractInteractions } from '../../utils/contractInteractions';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { toast } from '../ui/use-toast';
import { SearchFilter } from '../Search/SearchFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const ClientProjectsPage = () => {
    const { address } = useAccount();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        skills: '',
        category: 'development'
    });

    useEffect(() => {
        if (address) {
            fetchClientProjects();
        }
    }, [address]);

    const fetchClientProjects = async () => {
        try {
            setLoading(true);
            const allProjects = await contractInteractions.getAllProjects();
            
            console.log("All projects:", allProjects);
            console.log("Current address:", address);
            
            // Filter projects where the client is the current user
            const clientProjects = allProjects.filter(project => {
                const isMatch = project.client && 
                    project.client.toLowerCase() === address.toLowerCase();
                console.log("Project:", project.id, "Client:", project.client, "Match:", isMatch);
                return isMatch;
            });

            console.log("Filtered client projects:", clientProjects);

            // Sort projects by creation time (newest first)
            const sortedProjects = clientProjects.sort((a, b) => 
                Number(b.timestamp) - Number(a.timestamp)
            );
            
            console.log("Sorted projects:", sortedProjects);
            setProjects(sortedProjects);
        } catch (error) {
            console.error("Error fetching projects:", error);
            toast({
                title: "Error",
                description: "Failed to load your projects",
                variant: "destructive"
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
            if (!newProject.title || !newProject.description || !newProject.budget || !newProject.deadline) {
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

            // Create project
            const tx = await contractInteractions.createProject(
                newProject.title,
                newProject.description,
                newProject.budget,
                Math.floor(new Date(newProject.deadline).getTime() / 1000),
                newProject.skills.split(',').map(skill => skill.trim()).filter(Boolean)
            );

            console.log("Transaction sent:", tx);

            // Show pending toast
            toast({
                title: "Transaction Pending",
                description: "Your project creation transaction is being processed...",
            });

            // Wait for the transaction to be mined
            const receipt = await tx.wait();
            console.log("Transaction receipt:", receipt);

            // Reset form
            setNewProject({
                title: '',
                description: '',
                budget: '',
                deadline: '',
                skills: '',
                category: 'development'
            });

            // Close modal
            setShowCreateModal(false);

            // Show success toast
            toast({
                title: "Success",
                description: "Project created successfully!"
            });

            // Add delay before fetching updated projects
            setTimeout(() => {
                fetchClientProjects();
            }, 2000);

        } catch (error) {
            console.error("Error creating project:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to create project",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        const icons = {
            'open': <Clock className="w-5 h-5 text-blue-500" />,
            'in_progress': <Clock className="w-5 h-5 text-yellow-500" />,
            'completed': <CheckCircle className="w-5 h-5 text-green-500" />,
            'disputed': <AlertTriangle className="w-5 h-5 text-red-500" />
        };
        return icons[status] || icons.open;
    };

    if (!address) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">Please connect your wallet</h2>
                <p className="text-gray-600">You need to connect your wallet to view and manage projects</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pt-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">My Projects</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Post New Project
                </Button>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Active Projects</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="disputed">Disputed</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects
                            .filter(p => p.status === 'open' || p.status === 'in_progress')
                            .map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                    </div>
                </TabsContent>

                <TabsContent value="completed">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects
                            .filter(p => p.status === 'completed')
                            .map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                    </div>
                </TabsContent>

                <TabsContent value="disputed">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects
                            .filter(p => p.status === 'disputed')
                            .map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Post New Project</DialogTitle>
                        <DialogDescription>
                            Create a new project and set up the escrow payment.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div>
                            <Input
                                placeholder="Project Title"
                                value={newProject.title}
                                onChange={(e) => setNewProject(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                                required
                            />
                        </div>
                        <div>
                            <Textarea
                                placeholder="Project Description"
                                value={newProject.description}
                                onChange={(e) => setNewProject(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Budget (ETH)"
                                value={newProject.budget}
                                onChange={(e) => setNewProject(prev => ({
                                    ...prev,
                                    budget: e.target.value
                                }))}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                value={newProject.deadline}
                                onChange={(e) => setNewProject(prev => ({
                                    ...prev,
                                    deadline: e.target.value
                                }))}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Required Skills (comma separated)"
                                value={newProject.skills}
                                onChange={(e) => setNewProject(prev => ({
                                    ...prev,
                                    skills: e.target.value
                                }))}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Post Project'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ProjectCard component
const ProjectCard = ({ project }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription>
                            Created: {new Date(Number(project.deadline) * 1000).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <Badge variant={
                        project.status === 'open' ? 'default' :
                        project.status === 'in_progress' ? 'secondary' :
                        project.status === 'completed' ? 'success' : 'destructive'
                    }>
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
                        <span>{new Date(Number(project.deadline) * 1000).toLocaleDateString()}</span>
                    </div>
                    <Button 
                        className="w-full mt-4"
                        variant="outline"
                    >
                        Manage Project
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ClientProjectsPage; 