'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';

export default function CollectionPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Fetch collection metrics
  const { data: metrics = {} } = useQuery({
    queryKey: ['collection-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/collection/metrics');
      return response.data;
    },
  });

  // Fetch collection stats
  const { data: stats = {} } = useQuery({
    queryKey: ['collection-stats'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/stats');
      return response.data;
    },
  });

  // Fetch top debtors
  const { data: topDebtors = [] } = useQuery({
    queryKey: ['top-debtors'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/collection/top-debtors?limit=10');
      return response.data;
    },
  });

  // Fetch collection performance
  const { data: performance = [] } = useQuery({
    queryKey: ['collection-performance'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/performance?months=12');
      return response.data;
    },
  });

  // Fetch efficiency score
  const { data: scoreData = {} } = useQuery({
    queryKey: ['efficiency-score'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/collection/efficiency-score');
      return response.data;
    },
  });

  // Fetch unpaid bills
  const { data: unpaidBills = [] } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/unpaid-collection?take=20');
      return response.data;
    },
  });

  // Fetch overdue bills
  const { data: overdueBills = [] } = useQuery({
    queryKey: ['overdue-bills'],
    queryFn: async () => {
      const response = await api.get('/api/enhanced-billing/overdue?take=20');
      return response.data;
    },
  });

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];

  const debtorData = topDebtors.slice(0, 5).map((d: any) => ({
    name: d.fullName.split(' ')[0],
    debt: d.totalDebt,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Collection Management</h1>
        <p className="text-gray-600">Monitor and manage billing collections</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.collectionRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-500 mt-1">of total billed amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">KES {(stats.totalOutstanding || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">awaiting collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Efficiency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scoreData.score?.toFixed(1) || 0}/100</div>
            <p className="text-xs text-gray-500 mt-1">collection efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Days to Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.averageDaysToCollect || 0}</div>
            <p className="text-xs text-gray-500 mt-1">days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="debtors">Top Debtors</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Bills</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Collection Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance (12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalCollected" fill="#3b82f6" name="Collected" />
                    <Bar dataKey="totalGenerated" fill="#e5e7eb" name="Generated" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Collection Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Bill Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: metrics.totalBillsCollected || 0 },
                        { name: 'Unpaid', value: (metrics.totalBillsGenerated || 0) - (metrics.totalBillsCollected || 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-600">Total Generated</p>
                  <p className="text-2xl font-bold">KES {(metrics.totalAmountGenerated || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600">KES {(metrics.totalAmountCollected || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">KES {((metrics.totalAmountGenerated || 0) - (metrics.totalAmountCollected || 0)).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Debtors Tab */}
        <TabsContent value="debtors">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Debtors</CardTitle>
              <CardDescription>Residents with highest outstanding balances</CardDescription>
            </CardHeader>
            <CardContent>
              {topDebtors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No debtors found</div>
              ) : (
                <div className="space-y-3">
                  {topDebtors.map((debtor: any, index: number) => (
                    <div key={debtor.residentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{debtor.fullName}</p>
                          <p className="text-sm text-gray-600">{debtor.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">KES {debtor.totalDebt.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{debtor.billCount} unpaid bills</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Debtors Bar Chart */}
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={debtorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="debt" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unpaid Bills Tab */}
        <TabsContent value="unpaid">
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Bills</CardTitle>
              <CardDescription>Bills awaiting payment</CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No unpaid bills</div>
              ) : (
                <div className="space-y-3">
                  {unpaidBills.map((bill: any) => (
                    <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{bill.billNumber}</p>
                        <p className="text-sm text-gray-600">{bill.resident.fullName} - {bill.house.houseNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES {bill.balance.toLocaleString()}</p>
                        <Badge variant="outline">{bill.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Bills Tab */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Overdue Bills
              </CardTitle>
              <CardDescription>Bills past due date</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No overdue bills</div>
              ) : (
                <div className="space-y-3">
                  {overdueBills.map((bill: any) => (
                    <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                      <div>
                        <p className="font-medium">{bill.billNumber}</p>
                        <p className="text-sm text-gray-600">{bill.resident.fullName} - {bill.house.houseNumber}</p>
                        <p className="text-xs text-red-600">Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">KES {bill.balance.toLocaleString()}</p>
                        <Badge variant="destructive">OVERDUE</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
