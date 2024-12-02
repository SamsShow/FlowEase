import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Plus, DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { contractInteractions } from '../utils/contractInteractions'
import { Loading } from './ui/loading'
import { toast } from './ui/use-toast'
import { ethers } from 'ethers'

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  completed: 'bg-green-500/10 text-green-500',
  disputed: 'bg-red-500/10 text-red-500'
}

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({
    totalEarnings: '0',
    activeProjects: 0,
    completedProjects: 0,
    disputes: 0
  })

  useEffect(() => {
    if (isConnected) {
      fetchDashboardData()
    }
  }, [isConnected, address])

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
  
      // Fetch user-specific data directly
      const userProfile = await contract.getUserProfile(address);
  
      // Instead of getUserMilestones, you'll need to implement a different approach
      // For example, you might need to manually filter milestones
      const milestoneCount = await contract.milestoneCounter();
      const formattedProjects = [];
  
      for (let i = 0; i < milestoneCount; i++) {
        const milestone = await contract.milestones(i);
        
        // Check if the milestone is related to the current user (either as freelancer or client)
        if (milestone.freelancer === address || milestone.client === address) {
          formattedProjects.push({
            id: milestone.id.toString(),
            title: milestone.description,
            client: milestone.client,
            amount: ethers.formatEther(milestone.amount),
            deadline: new Date(Number(milestone.deadline) * 1000).toLocaleDateString(),
            status: getMilestoneStatus(Number(milestone.status)),
            milestones: 1,
            completedMilestones: Number(milestone.status) === 3 ? 1 : 0
          });
        }
      }
  
      // Calculate stats
      const statsToSet = {
        totalEarnings: ethers.formatEther(userProfile.totalEarnings || '0'),
        activeProjects: formattedProjects.filter(p => p.status === 'in_progress').length,
        completedProjects: Number(userProfile.completedProjects || 0),
        disputes: formattedProjects.filter(p => p.status === 'disputed').length
      };
  
      setStats(statsToSet);
      setProjects(formattedProjects);
  
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert numeric status to string
  const getMilestoneStatus = (statusNum) => {
    const statusMap = {
      0: 'pending',
      1: 'in_progress',
      2: 'submitted',
      3: 'approved',
      4: 'disputed',
      5: 'rejected'
    };
    return statusMap[statusNum] || 'pending';
  };

  const handleNewProject = () => {
    navigate('/payment-request')
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Please connect your wallet</h2>
        <p className="text-gray-600">You need to connect your wallet to view your dashboard</p>
      </div>
    )
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={handleNewProject}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEarnings} ETH</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.disputes}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>{project.title}</TableCell>
                          <TableCell>{project.client}</TableCell>
                          <TableCell>{project.amount} ETH</TableCell>
                          <TableCell>{project.deadline}</TableCell>
                          <TableCell>
                            {project.completedMilestones}/{project.milestones} Milestones
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={project.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/milestones/${project.id}`)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No projects found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Project Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Milestone content will be implemented in Milestones.jsx */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Active Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Dispute content will be implemented in Disputes.jsx */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 