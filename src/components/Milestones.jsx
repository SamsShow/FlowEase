import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export default function Milestones() {
  const [milestones, setMilestones] = useState([
    {
      id: 1,
      title: 'Initial Design',
      description: 'Homepage wireframes and design mockups',
      amount: '1.5 ETH',
      deadline: '2024-02-15',
      status: 'completed',
      projectId: 1
    },
    {
      id: 2,
      title: 'Frontend Development',
      description: 'Implement responsive frontend with React',
      amount: '2 ETH',
      deadline: '2024-03-01',
      status: 'in-progress',
      projectId: 1
    }
  ])

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: ''
  })

  const statusIcons = {
    completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    'in-progress': <Clock className="w-5 h-5 text-yellow-500" />,
    disputed: <AlertCircle className="w-5 h-5 text-red-500" />
  }

  const handleAddMilestone = (e) => {
    e.preventDefault()
    // TODO: Integrate with smart contract
    const milestone = {
      id: milestones.length + 1,
      ...newMilestone,
      status: 'pending',
      projectId: 1
    }
    setMilestones([...milestones, milestone])
    setNewMilestone({ title: '', description: '', amount: '', deadline: '' })
  }

  const handleSubmitMilestone = async (id) => {
    // TODO: Integrate with smart contract for milestone submission
    const updatedMilestones = milestones.map(m => 
      m.id === id ? { ...m, status: 'in-progress' } : m
    )
    setMilestones(updatedMilestones)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Project Milestones</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Milestone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                  placeholder="Milestone title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                  placeholder="Describe the deliverables"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newMilestone.amount}
                    onChange={(e) => setNewMilestone({...newMilestone, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newMilestone.deadline}
                    onChange={(e) => setNewMilestone({...newMilestone, deadline: e.target.value})}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Create Milestone</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className="relative">
            <div className="absolute top-4 right-4">
              {statusIcons[milestone.status]}
            </div>
            <CardHeader>
              <CardTitle>{milestone.title}</CardTitle>
              <CardDescription>Due: {milestone.deadline}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{milestone.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-semibold">{milestone.amount}</span>
                {milestone.status === 'pending' && (
                  <Button 
                    variant="outline"
                    onClick={() => handleSubmitMilestone(milestone.id)}
                  >
                    Submit for Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
