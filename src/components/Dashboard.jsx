import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Plus, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'

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
  const [projects, setProjects] = useState([
    {
      id: 1,
      title: 'Website Development',
      client: '0x1234...5678',
      amount: '5 ETH',
      deadline: '2024-03-01',
      status: 'pending',
      milestones: 3,
      completedMilestones: 1
    }
    // Add more mock projects as needed
  ])

  const stats = [
    {
      title: 'Total Earnings',
      value: '15.5 ETH',
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />
    },
    {
      title: 'Active Projects',
      value: '4',
      icon: <Clock className="w-4 h-4 text-blue-500" />
    },
    {
      title: 'Completed Projects',
      value: '12',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    },
    {
      title: 'Disputes',
      value: '0',
      icon: <AlertCircle className="w-4 h-4 text-red-500" />
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>{project.title}</TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell>{project.amount}</TableCell>
                        <TableCell>{project.deadline}</TableCell>
                        <TableCell>
                          {project.completedMilestones}/{project.milestones} Milestones
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          {/* Milestone content will be implemented in Milestones.jsx */}
        </TabsContent>

        <TabsContent value="transactions">
          {/* Transaction content will be implemented in Transactions.jsx */}
        </TabsContent>
      </Tabs>
    </div>
  )
} 