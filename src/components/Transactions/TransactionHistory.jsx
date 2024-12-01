import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { SearchFilter } from '../Search/SearchFilter';
import { contractInteractions } from '../../utils/contractInteractions';
import { Loading } from '../ui/loading';
import { toast } from '../ui/use-toast';

export const TransactionHistory = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  useEffect(() => {
    if (address) {
      fetchTransactions();
    }
  }, [address]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Get milestone status change events
      const statusFilter = contract.filters.MilestoneStatusChanged(null);
      const statusEvents = await contract.queryFilter(statusFilter);
      
      // Get milestone creation events
      const creationFilter = contract.filters.MilestoneCreated(null, null, address);
      const creationEvents = await contract.queryFilter(creationFilter);
      
      // Combine and format all events
      const allEvents = [...statusEvents, ...creationEvents];
      
      // Sort events by timestamp
      allEvents.sort((a, b) => b.args.timestamp - a.args.timestamp);
      
      // Format transactions
      const formattedTxs = await Promise.all(
        allEvents.map(async (event) => {
          const milestone = await contract.milestones(event.args.milestoneId);
          return {
            id: event.transactionHash,
            type: event.event === 'MilestoneCreated' ? 'Created' : event.args.newStatus,
            amount: milestone.amount.toString(),
            from: milestone.client,
            to: milestone.freelancer,
            timestamp: new Date(Number(milestone.createdAt) * 1000),
            status: milestone.status.toString().toLowerCase()
          };
        })
      );

      setTransactions(formattedTxs);
      setFilteredTransactions(formattedTxs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    const filtered = transactions.filter(tx => 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTransactions(filtered);
  };

  const handleFilter = (filters) => {
    let filtered = [...transactions];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        today: new Date(now.setDate(now.getDate() - 1)),
        week: new Date(now.setDate(now.getDate() - 7)),
        month: new Date(now.setMonth(now.getMonth() - 1)),
        year: new Date(now.setFullYear(now.getFullYear() - 1))
      };
      filtered = filtered.filter(tx => tx.timestamp >= ranges[filters.dateRange]);
    }

    // Amount filter
    if (filters.amount !== 'all') {
      const [min, max] = filters.amount.split('-').map(Number);
      filtered = filtered.filter(tx => {
        const amount = Number(tx.amount) / 1e18; // Convert from wei to ETH
        return max ? amount >= min && amount <= max : amount >= min;
      });
    }

    setFilteredTransactions(filtered);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Transaction History</h2>

      <SearchFilter onSearch={handleSearch} onFilter={handleFilter} />

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono">
                      {tx.id.slice(0, 8)}...{tx.id.slice(-6)}
                    </TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell>{Number(tx.amount) / 1e18} ETH</TableCell>
                    <TableCell className="font-mono">
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </TableCell>
                    <TableCell>
                      {tx.timestamp.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === 'completed' ? 'success' :
                          tx.status === 'pending' ? 'warning' :
                          'destructive'
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory; 