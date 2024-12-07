import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import PaymentWidget from "@requestnetwork/payment-widget/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { toast } from './ui/use-toast';
import { Loading } from './ui/loading';
import { DollarSign } from 'lucide-react';
import { contractInteractions } from '../utils/contractInteractions';

export default function MilestoneSubmission() {
  const { address } = useAccount();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  useEffect(() => {
    fetchMilestones();
  }, [address]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const fetchedMilestones = await contractInteractions.getMilestones();
      setMilestones(fetchedMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: "Error",
        description: "Failed to fetch milestones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (milestone) => {
    setSelectedMilestone(milestone);
    setShowPaymentWidget(true);
  };

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto p-4">
      {milestones.map((milestone) => (
        <Card key={milestone.id} className="mb-4">
          <CardHeader>
            <CardTitle>Milestone {milestone.id}</CardTitle>
            <CardDescription>{milestone.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <Badge>{milestone.status}</Badge>
                <p className="mt-2">{milestone.amount} ETH</p>
              </div>
              <Button
                onClick={() => handlePaymentClick(milestone)}

              >
                Pay Milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={showPaymentWidget} onOpenChange={setShowPaymentWidget}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Milestone Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Process payment for milestone completion
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedMilestone && (
            <div className="py-4">
              <PaymentWidget
                sellerInfo={{
                  name: "Milestone Payment",
                }}
                productInfo={{
                  name: `Milestone ${selectedMilestone.id}`,
                  description: selectedMilestone.description,
                }}
                amount={selectedMilestone.amount}
                currency="ETH"
                paymentAddress={selectedMilestone.freelancer}
                supportedCurrencies={["ETH-sepolia"]}
                network="sepolia"
                persistRequest={true}
                onPaymentSuccess={async (request) => {
                  try {
                    await contractInteractions.approveMilestonePayment(selectedMilestone.id);
                    toast({
                      title: "Success",
                      description: "Payment completed successfully",
                      variant: "default",
                    });
                    setShowPaymentWidget(false);
                    fetchMilestones();
                  } catch (error) {
                    console.error('Payment error:', error);
                    toast({
                      title: "Error",
                      description: "Payment failed",
                      variant: "destructive",
                    });
                  }
                }}
                onError={(error) => {
                  console.error('Payment error:', error);
                  toast({
                    title: "Error",
                    description: error.message || "Payment failed",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}