import React, { useEffect, useState } from 'react';
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

const ExplorePage = () => {
    const { address } = useAccount();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        milestones: [{ description: '', amount: '' }]
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const allProjects = await contractInteractions.getAllProjects();
            const uniqueProjects = Array.from(new Map(
                allProjects.map(project => [project.id, project])
            ).values());
            
            const sortedProjects = uniqueProjects.sort((a, b) => b.createdAt - a.createdAt);
            
            setProjects(sortedProjects);
            setFilteredProjects(sortedProjects);
        } catch (error) {
            console.error("Error fetching projects:", error);
            toast({
                title: "Error",
                description: "Failed to load projects",
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

            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            const confirmCreate = window.confirm(
                "Are you sure you want to create this project? You'll need to confirm the transaction in MetaMask."
            );
            
            if (!confirmCreate) {
                setLoading(false);
                return;
            }
            try {
                // Parse amount to wei
                const amount = ethers.parseEther(budgetNum.toString());
                
                console.log("Creating milestone with params:", {
                    address,
                    amount: amount.toString(),
                    description: newProject.description,
                    deadline: deadlineTimestamp
                });

                // Create milestone
                const tx = await contractInteractions.createMilestone(
                    address,
                    amount,
                    newProject.description,
                    deadlineTimestamp
                );

                toast({
                    title: "Success",
                    description: `Project created successfully! Transaction: ${tx.slice(0, 10)}...`
                });

                setShowCreateModal(false);
                await fetchProjects();
                
                // Reset form
                setNewProject({
                    title: '',
                    description: '',
                    budget: '',
                    deadline: '',
                    milestones: [{ description: '', amount: '' }]
                });
            } catch (txError) {
                console.error("Transaction error:", txError);
                throw new Error(txError.message || "Transaction failed. Please check your wallet has sufficient funds.");
            }
        } catch (error) {
            console.error("Error creating project:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to create project. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (searchTerm) => {
        const filtered = projects.filter(project => 
            project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProjects(filtered);
    };

    const handleFilter = (filters) => {
        let filtered = [...projects];

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(project => project.status === filters.status);
        }

        // Budget filter
        if (filters.amount !== 'all') {
            const [min, max] = filters.amount.split('-').map(Number);
            filtered = filtered.filter(project => {
                const budget = Number(project.budget);
                return max ? budget >= min && budget <= max : budget >= min;
            });
        }

        setFilteredProjects(filtered);
    };

    const addMilestone = () => {
        setNewProject(prev => ({
            ...prev,
            milestones: [...prev.milestones, { description: '', amount: '' }]
        }));
    };

    if (loading) {
        return <div className="p-6 text-center">Loading projects...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Explore Projects</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    Create New Project
                </Button>
            </div>

            <div className="mb-6">
                <SearchFilter onSearch={handleSearch} onFilter={handleFilter} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                    <Card key={project.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{project.title}</CardTitle>
                                    <CardDescription>
                                        Posted by: {project.client.slice(0, 6)}...{project.client.slice(-4)}
                                    </CardDescription>
                                </div>
                                <Badge variant={
                                    project.status === 'open' ? 'default' :
                                    project.status === 'in_progress' ? 'secondary' :
                                    'outline'
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
                                    onClick={() => {}}
                                >
                                    View Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Fill in the project details and set up milestones for your new project.
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
                                placeholder="Total Budget (ETH)"
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

                        <div className="space-y-2">
                            <h3 className="font-medium">Milestones</h3>
                            {newProject.milestones.map((milestone, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="Milestone Description"
                                        value={milestone.description}
                                        onChange={(e) => {
                                            const newMilestones = [...newProject.milestones];
                                            newMilestones[index].description = e.target.value;
                                            setNewProject(prev => ({
                                                ...prev,
                                                milestones: newMilestones
                                            }));
                                        }}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Amount (ETH)"
                                        value={milestone.amount}
                                        onChange={(e) => {
                                            const newMilestones = [...newProject.milestones];
                                            newMilestones[index].amount = e.target.value;
                                            setNewProject(prev => ({
                                                ...prev,
                                                milestones: newMilestones
                                            }));
                                        }}
                                    />
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addMilestone}>
                                Add Milestone
                            </Button>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Project'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExplorePage; 