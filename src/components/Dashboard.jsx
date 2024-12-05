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
  pending: 'bg-yellow-500/30 text-yellow-200',
  completed: 'bg-green-500/30 text-green-200',
  disputed: 'bg-red-500/30 text-red-200'
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
  
      const userProfile = await contract.getUserProfile(address);
  
      const milestoneCount = await contract.milestoneCounter();
      const formattedProjects = [];
  
      for (let i = 0; i < milestoneCount; i++) {
        const milestone = await contract.milestones(i);
        
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
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-50">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-center">You need to connect your wallet to view your dashboard</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 p-6 pt-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Dashboard</h1>
          <Button onClick={handleNewProject} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Total Earnings</CardTitle>
              <DollarSign className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-semibold">{stats.totalEarnings} ETH</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Active Projects</CardTitle>
              <Clock className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-semibold">{stats.activeProjects}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Completed Projects</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-semibold">{stats.completedProjects}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Active Disputes</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-semibold">{stats.disputes}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="bg-gray-800 text-gray-300">
            <TabsTrigger value="projects" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Projects</TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Milestones</TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-200">Project</TableHead>
                        <TableHead className="text-gray-200">Client</TableHead>
                        <TableHead className="text-gray-200">Amount</TableHead>
                        <TableHead className="text-gray-200">Deadline</TableHead>
                        <TableHead className="text-gray-200">Progress</TableHead>
                        <TableHead className="text-gray-200">Status</TableHead>
                        <TableHead className="text-gray-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.length > 0 ? (
                        projects.map((project) => (
                          <TableRow key={project.id} className="border-gray-700">
                            <TableCell className="font-medium text-gray-50">{project.title}</TableCell>
                            <TableCell className="text-gray-50">{project.client}</TableCell>
                            <TableCell className="text-gray-50">{project.amount} ETH</TableCell>
                            <TableCell className="text-gray-50">{project.deadline}</TableCell>
                            <TableCell className="text-gray-50">
                              {project.completedMilestones}/{project.milestones} Milestones
                            </TableCell>
                            <TableCell className="text-gray-50">
                              <StatusBadge status={project.status} />
                            </TableCell>
                            <TableCell className="text-gray-50">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/milestones/${project.id}`)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-300">
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
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Project Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Milestone content will be implemented in Milestones.jsx */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Active Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Dispute content will be implemented in Disputes.jsx */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

