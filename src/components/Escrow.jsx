import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function Escrow() {
  const [escrows, setEscrows] = useState([
    {
      id: 1,
      projectTitle: 'Website Development',
      milestone: 'Frontend Development',
      amount: '2 ETH',
      freelancer: '0x1234...5678',
      status: 'pending',
      deadline: '2024-03-01'
    }
  ])

  const handleApprove = async (id) => {
    // TODO: Integrate with smart contract
    const updatedEscrows = escrows.map(escrow =>
      escrow.id === id ? { ...escrow, status: 'approved' } : escrow
    )
    setEscrows(updatedEscrows)
  }

  const handleDispute = async (id) => {
    // TODO: Integrate with smart contract
    const updatedEscrows = escrows.map(escrow =>
      escrow.id === id ? { ...escrow, status: 'disputed' } : escrow
    )
    setEscrows(updatedEscrows)
  }

  const statusColors = {
    pending: 'text-yellow-500',
    approved: 'text-green-500',
    disputed: 'text-red-500'
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Escrow Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escrows.map((escrow) => (
          <Card key={escrow.id}>
            <CardHeader>
              <CardTitle>{escrow.projectTitle}</CardTitle>
              <CardDescription>Milestone: {escrow.milestone}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount:</span>
                  <span className="font-semibold">{escrow.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Freelancer:</span>
                  <span className="font-mono text-sm">{escrow.freelancer}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`font-semibold ${statusColors[escrow.status]}`}>
                    {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </span>
                </div>
                
                {escrow.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1" variant="outline">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Payment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve and release the payment? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(escrow.id)}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1" variant="destructive">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Dispute
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Raise Dispute</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to raise a dispute? 
                            This will initiate the dispute resolution process.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDispute(escrow.id)}>
                            Raise Dispute
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
