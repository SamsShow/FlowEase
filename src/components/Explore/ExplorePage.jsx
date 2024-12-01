import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { contractInteractions } from '../../utils/contractInteractions';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
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
            setProjects(allProjects);
            setFilteredProjects(allProjects);
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
            const deadlineTimestamp = Math.floor(new Date(newProject.deadline).getTime() / 1000);
            
            // Calculate total budget from milestones
            const totalAmount = ethers.parseEther(newProject.budget);
            
            // Format milestones for contract
            const milestones = newProject.milestones.map(m => ({
                description: m.description,
                amount: ethers.parseEther(m.amount)
            }));

            // Create escrow
            await contractInteractions.createEscrow(
                address,
                totalAmount,
                milestones,
                deadlineTimestamp
            );

            toast({
                title: "Success",
                description: "Project created successfully!"
            });

            setShowCreateModal(false);
            fetchProjects();
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