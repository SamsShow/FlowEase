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
            const allProjects = await contractInteractions.getAllProjects();
            // Filter projects where the client is the current user
            const clientProjects = allProjects.filter(
                project => project.client.toLowerCase() === address.toLowerCase()
            );
            setProjects(clientProjects);
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
            const deadlineTimestamp = Math.floor(new Date(newProject.deadline).getTime() / 1000);

            // First create the project
            const projectTx = await contractInteractions.createProject(
                newProject.title,
                newProject.description,
                newProject.budget,
                deadlineTimestamp,
                newProject.skills
            );

            // Then create the escrow for the project
            await contractInteractions.createEscrow(
                projectTx.events[0].args.projectId, // Get the project ID from the event
                ethers.parseEther(newProject.budget),
                [{
                    description: "Initial milestone",
                    amount: newProject.budget
                }],
                deadlineTimestamp
            );

            toast({
                title: "Success",
                description: "Project created successfully!"
            });

            setShowCreateModal(false);
            fetchClientProjects();
        } catch (error) {
            console.error("Error creating project:", error);
            toast({
                title: "Error",
                description: "Failed to create project",
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
        <div className="container mx-auto px-4 py-8">
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
                            Created: {new Date(project.deadline * 1000).toLocaleDateString()}
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
                        <span>{new Date(project.deadline * 1000).toLocaleDateString()}</span>
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