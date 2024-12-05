import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { contractInteractions } from '../../utils/contractInteractions';
import { Loading } from '../ui/loading';
import { toast } from '../ui/use-toast';
import { ethers } from 'ethers';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

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
      borderColor: 'hsl(var(--chart-1))',
      backgroundColor: 'hsl(var(--chart-1) / 0.1)',
      tension: 0.1,
      fill: true
    }]
  });

  const formatProjectStats = (stats) => ({
    labels: ['Completed', 'In Progress', 'Disputed'],
    datasets: [{
      data: [stats.completed, stats.inProgress, stats.disputed],
      backgroundColor: [
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))'
      ]
    }]
  });

  const formatDisputeStats = (stats) => ({
    labels: ['Resolved', 'Pending'],
    datasets: [{
      label: 'Dispute Resolution',
      data: [stats.completed, stats.disputed],
      backgroundColor: [
        'hsl(var(--chart-2))',
        'hsl(var(--chart-4))'
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
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))'
      ]
    }]
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 text-gray-100 pt-20">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Earnings Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                earnings: {
                  label: "Monthly Earnings (ETH)",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <Line
                data={analytics.earnings}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    tooltip: {
                      enabled: false,
                    },
                  },
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                completed: {
                  label: "Completed",
                  color: "hsl(var(--chart-2))",
                },
                inProgress: {
                  label: "In Progress",
                  color: "hsl(var(--chart-3))",
                },
                disputed: {
                  label: "Disputed",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <Doughnut
                data={analytics.projectStatus}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    tooltip: {
                      enabled: false,
                    },
                  }
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Dispute Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                resolved: {
                  label: "Resolved",
                  color: "hsl(var(--chart-2))",
                },
                pending: {
                  label: "Pending",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <Bar
                data={analytics.disputeResolution}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    tooltip: {
                      enabled: false,
                    },
                  }
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Client Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                client1: {
                  label: "Client 1",
                  color: "hsl(var(--chart-1))",
                },
                client2: {
                  label: "Client 2",
                  color: "hsl(var(--chart-2))",
                },
                client3: {
                  label: "Client 3",
                  color: "hsl(var(--chart-3))",
                },
                client4: {
                  label: "Client 4",
                  color: "hsl(var(--chart-4))",
                },
                client5: {
                  label: "Client 5",
                  color: "hsl(var(--chart-5))",
                },
              }}
              className="h-[300px]"
            >
              <Doughnut
                data={analytics.clientDistribution}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                      }
                    },
                    tooltip: {
                      enabled: false,
                    },
                  }
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

