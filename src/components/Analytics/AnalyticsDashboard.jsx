import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { contractInteractions } from '../../utils/contractInteractions';
import { Loading } from '../ui/loading';
import { toast } from '../ui/use-toast';
import { ethers } from 'ethers';

// Chart.js setup
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    earnings: {
      labels: [],
      datasets: []
    },
    projectStatus: {
      labels: [],
      datasets: []
    },
    disputeResolution: {
      labels: [],
      datasets: []
    },
    clientDistribution: {
      labels: [],
      datasets: []
    }
  });

  useEffect(() => {
    if (address) {
      fetchAnalytics();
    }
  }, [address]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const contract = await contractInteractions.getContract();
      
      // Get milestone events for the user
      const filter = contract.filters.MilestoneCreated(null, null, address);
      const events = await contract.queryFilter(filter);
      
      // Process events to get earnings data
      const monthlyEarnings = new Array(12).fill(0);
      const projectStatuses = { completed: 0, inProgress: 0, disputed: 0 };
      const clientMap = new Map();

      await Promise.all(events.map(async (event) => {
        const milestone = await contract.milestones(event.args.milestoneId);
        const amount = ethers.formatEther(milestone.amount);
        const month = new Date(Number(milestone.createdAt) * 1000).getMonth();
        monthlyEarnings[month] += Number(amount);

        // Track project statuses
        const status = milestone.status.toLowerCase();
        if (status === 'completed') projectStatuses.completed++;
        else if (status === 'in_progress') projectStatuses.inProgress++;
        else if (status === 'disputed') projectStatuses.disputed++;

        // Track clients
        const client = milestone.client;
        clientMap.set(client, (clientMap.get(client) || 0) + 1);
      }));

      // Format data for charts
      const formattedData = {
        earnings: formatEarningsData(monthlyEarnings),
        projectStatus: formatProjectStats(projectStatuses),
        disputeResolution: formatDisputeStats(projectStatuses),
        clientDistribution: formatClientData(clientMap)
      };

      setAnalytics(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const formatEarningsData = (monthlyData) => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Monthly Earnings (ETH)',
      data: monthlyData,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
      fill: false
    }]
  });

  const formatProjectStats = (stats) => ({
    labels: ['Completed', 'In Progress', 'Disputed'],
    datasets: [{
      data: [stats.completed, stats.inProgress, stats.disputed],
      backgroundColor: [
        'rgb(34, 197, 94)',
        'rgb(234, 179, 8)',
        'rgb(239, 68, 68)'
      ]
    }]
  });

  const formatDisputeStats = (stats) => ({
    labels: ['Resolved', 'Pending'],
    datasets: [{
      label: 'Dispute Resolution',
      data: [stats.completed, stats.disputed],
      backgroundColor: [
        'rgb(34, 197, 94)',
        'rgb(239, 68, 68)'
      ]
    }]
  });

  const formatClientData = (clientMap) => ({
    labels: Array.from(clientMap.keys()).map(addr => 
      `${addr.slice(0, 6)}...${addr.slice(-4)}`
    ),
    datasets: [{
      data: Array.from(clientMap.values()),
      backgroundColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)',
        'rgb(168, 85, 247)'
      ]
    }]
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={analytics.earnings}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Doughnut
              data={analytics.projectStatus}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispute Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={analytics.disputeResolution}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Doughnut
              data={analytics.clientDistribution}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 