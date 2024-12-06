import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Plus, DollarSign, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { contractInteractions } from '../utils/contractInteractions'
import { requestNetworkHelper } from '../utils/requestNetworkHelper'
import { Loading } from './ui/loading'
import { toast } from './ui/use-toast'
import { ethers } from 'ethers'

const statusColors = {
  pending: 'bg-yellow-500/30 text-yellow-200',
  in_progress: 'bg-blue-500/30 text-blue-200',
  submitted: 'bg-purple-500/30 text-purple-200',
  approved: 'bg-green-500/30 text-green-200',
  disputed: 'bg-red-500/30 text-red-200',
  rejected: 'bg-gray-500/30 text-gray-200'
}

const StatusBadge = ({ status }) => {
  const displayStatus = status.toLowerCase().replace(/_/g, ' ');
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [milestones, setMilestones] = useState([])
  const [stats, setStats] = useState({
    totalEarnings: '0',
    activeProjects: 0,
    completedProjects: 0,
    disputes: 0
  })
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (isConnected && address) {
      fetchDashboardData();
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  const getMilestoneStatus = (statusCode) => {
    const statusMap = {
      0: 'pending',
      1: 'in_progress',
      2: 'submitted',
      3: 'approved',
      4: 'disputed',
      5: 'rejected'
    };
    return statusMap[statusCode] || 'pending';
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data...');
      
      // Fetch projects and milestones in parallel
      const [allProjects, allMilestones] = await Promise.all([
        contractInteractions.getAllProjects(),
        contractInteractions.getAllMilestones()
      ]);

      console.log('Fetched data:', { allProjects, allMilestones });

      // Filter and format projects
      const userProjects = allProjects.filter(
        project => project.client === address
      ).map(project => ({
        ...project,
        milestones: allMilestones.filter(m => m.projectId === project.id).length,
        completedMilestones: allMilestones.filter(
          m => m.projectId === project.id && m.status === 'approved'
        ).length
      }));

      // Format milestones with proper status
      const userMilestones = allMilestones
        .filter(m => m.freelancer === address || m.client === address)
        .map(m => ({
          ...m,
          status: getMilestoneStatus(Number(m.statusCode))
        }));

      console.log('Processed data:', { userProjects, userMilestones });

      // Calculate stats
      const stats = {
        totalEarnings: userMilestones
          .filter(m => m.freelancer === address && m.status === 'approved')
          .reduce((total, m) => total + parseFloat(m.amount), 0)
          .toFixed(4),
        activeProjects: userProjects.filter(p => p.status === 'in_progress').length,
        completedProjects: userProjects.filter(p => p.status === 'completed').length,
        disputes: userMilestones.filter(m => m.status === 'disputed').length
      };

      setStats(stats);
      setProjects(userProjects);
      setMilestones(userMilestones);

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

  const fetchInvoices = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await requestNetworkHelper.initialize(provider);
      const requests = await requestNetworkHelper.getAllPaymentRequests(address);
      
      // Transform the requests data for display
      const formattedRequests = requests.map(request => {
        const requestData = request.getData();
        return {
          id: request.requestId,
          amount: ethers.formatUnits(requestData.expectedAmount, 18),
          currency: requestData.currency.value,
          payee: requestData.payee.value,
          payer: requestData.payer.value,
          status: requestData.state,
          description: requestData.contentData.description,
          deadline: new Date(requestData.contentData.deadline).toLocaleDateString(),
          timestamp: new Date(requestData.timestamp).toLocaleDateString()
        };
      });
      
      setInvoices(formattedRequests);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive"
      });
    }
  };

  const handleNewProject = () => {
    navigate('/explore')
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
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Your Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-200">Project</TableHead>
                        <TableHead className="text-gray-200">Budget</TableHead>
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
                            <TableCell className="text-gray-50">{project.budget} ETH</TableCell>
                            <TableCell className="text-gray-50">
                              {new Date(Number(project.deadline) * 1000).toLocaleDateString()}
                            </TableCell>
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
                                onClick={() => navigate(`/explore`)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-300">
                            No projects found. Click "New Project" to create one.
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
                <CardTitle className="text-xl font-semibold">Your Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-200">Description</TableHead>
                        <TableHead className="text-gray-200">Role</TableHead>
                        <TableHead className="text-gray-200">Amount</TableHead>
                        <TableHead className="text-gray-200">Deadline</TableHead>
                        <TableHead className="text-gray-200">Status</TableHead>
                        <TableHead className="text-gray-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestones.length > 0 ? (
                        milestones.map((milestone) => (
                          <TableRow key={milestone.id} className="border-gray-700">
                            <TableCell className="font-medium text-gray-50">{milestone.description}</TableCell>
                            <TableCell className="text-gray-50">
                              {milestone.freelancer === address ? 'Freelancer' : 'Client'}
                            </TableCell>
                            <TableCell className="text-gray-50">{milestone.amount} ETH</TableCell>
                            <TableCell className="text-gray-50">
                              {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-gray-50">
                              <StatusBadge status={milestone.status} />
                            </TableCell>
                            <TableCell className="text-gray-50">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/milestone-submission`)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-300">
                            No milestones found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loading />
                ) : invoices.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No invoices found
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>{invoice.timestamp}</TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="truncate">{invoice.description.split('\n')[0]}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {invoice.amount} {invoice.currency}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell>{invoice.deadline}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

