import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { requestNetworkHelper } from '../utils/requestNetworkHelper';
import { toast } from './ui/use-toast';

const InvoiceList = () => {
  const { address } = useAccount();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!address) return;
      
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
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [address]);

  const handleAcceptRequest = async (requestId) => {
    try {
      setLoading(true);
      await requestNetworkHelper.acceptPaymentRequest(requestId);
      toast({
        title: "Success",
        description: "Payment request accepted",
        variant: "default"
      });
      // Refresh the list
      const requests = await requestNetworkHelper.getAllPaymentRequests(address);
      setInvoices(requests);
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "bg-yellow-500",
      accepted: "bg-green-500",
      canceled: "bg-red-500",
      paid: "bg-blue-500"
    };

    return (
      <Badge className={statusColors[status.toLowerCase()] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          No invoices found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Invoices</h2>
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                {invoice.description.split('\n')[0]}
              </CardTitle>
              {getStatusBadge(invoice.status)}
            </div>
            <CardDescription>
              Created: {invoice.timestamp}
              <br />
              Due: {invoice.deadline}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">
                  {invoice.amount} {invoice.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {address.toLowerCase() === invoice.payee.toLowerCase() ? 'Client' : 'Payee'}
                </p>
                <p className="font-medium">
                  {address.toLowerCase() === invoice.payee.toLowerCase() ? invoice.payer : invoice.payee}
                </p>
              </div>
            </div>
            {address.toLowerCase() === invoice.payer.toLowerCase() && 
             invoice.status.toLowerCase() === 'pending' && (
              <Button
                className="mt-4"
                onClick={() => handleAcceptRequest(invoice.id)}
                disabled={loading}
              >
                Accept Request
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InvoiceList; 