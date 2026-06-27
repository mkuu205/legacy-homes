'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react';

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  reconciliationStatus: string;
  createdAt: string;
  bill?: {
    id: string;
    billNumber: string;
    totalAmount: number;
  };
  resident?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function PaymentReconciliationPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Fetch reconciliation stats
  const { data: stats = {} } = useQuery({
    queryKey: ['reconciliation-stats'],
    queryFn: async () => {
      const response = await api.get('/api/payment-reconciliation/stats');
      return response.data;
    },
  });

  // Fetch unreconciled payments
  const { data: unreconciledPayments = [], refetch: refetchUnreconciled } = useQuery({
    queryKey: ['unreconciled-payments'],
    queryFn: async () => {
      const response = await api.get('/api/payment-reconciliation/unreconciled?take=20');
      return response.data;
    },
  });

  // Fetch mismatched payments
  const { data: mismatchedPayments = [] } = useQuery({
    queryKey: ['mismatched-payments'],
    queryFn: async () => {
      const response = await api.get('/api/payment-reconciliation/mismatched?take=20');
      return response.data;
    },
  });

  // Fetch orphaned payments
  const { data: orphanedPayments = [] } = useQuery({
    queryKey: ['orphaned-payments'],
    queryFn: async () => {
      const response = await api.get('/api/payment-reconciliation/orphaned?take=20');
      return response.data;
    },
  });

  // Auto-reconcile mutation
  const autoReconcileMutation = useMutation({
    mutationFn: () => api.post('/api/payment-reconciliation/auto-reconcile', {}),
    onSuccess: (data: any) => {
      toast({ title: 'Success', description: data.data.message });
      refetchUnreconciled();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error, variant: 'destructive' });
    },
  });

  // Reconcile payment mutation
  const reconcilePaymentMutation = useMutation({
    mutationFn: (data: { paymentId: string; status: string }) =>
      api.post(`/api/payment-reconciliation/${data.paymentId}/reconcile`, { status: data.status }),
    onSuccess: () => {
      toast({ title: 'Payment reconciled successfully' });
      refetchUnreconciled();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECONCILED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'MISMATCH':
        return 'bg-orange-100 text-orange-800';
      case 'ORPHANED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Reconciliation</h1>
        <p className="text-gray-600">Reconcile and verify payment transactions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPayments || 0}</div>
            <p className="text-xs text-gray-500 mt-1">all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reconciliation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.reconciliationRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-500 mt-1">of payments reconciled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending || 0}</div>
            <p className="text-xs text-gray-500 mt-1">awaiting reconciliation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{(stats.mismatched || 0) + (stats.orphaned || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">mismatched + orphaned</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="unreconciled" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({stats.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="mismatched" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Mismatched ({stats.mismatched || 0})
          </TabsTrigger>
          <TabsTrigger value="orphaned" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Orphaned ({stats.orphaned || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium">Reconciled</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.reconciled || 0}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <p className="font-medium">Pending</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.pending || 0}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <p className="font-medium">Mismatched</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.mismatched || 0}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="font-medium">Orphaned</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.orphaned || 0}</p>
                </div>
              </div>

              <Button
                onClick={() => autoReconcileMutation.mutate()}
                disabled={autoReconcileMutation.isPending}
                className="w-full gap-2"
              >
                <Zap className="w-4 h-4" />
                Auto-Reconcile Matching Payments
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unreconciled Tab */}
        <TabsContent value="unreconciled">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reconciliation</CardTitle>
              <CardDescription>Payments awaiting reconciliation</CardDescription>
            </CardHeader>
            <CardContent>
              {unreconciledPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No pending payments</div>
              ) : (
                <div className="space-y-3">
                  {unreconciledPayments.map((payment: Payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{payment.paymentId}</p>
                        <p className="text-sm text-gray-600">
                          {payment.resident?.fullName} - {payment.bill?.billNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Amount: KES {payment.amount.toLocaleString()} | Bill: KES {payment.bill?.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            reconcilePaymentMutation.mutate({
                              paymentId: payment.id,
                              status: 'RECONCILED',
                            })
                          }
                          disabled={reconcilePaymentMutation.isPending}
                        >
                          Reconcile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mismatched Tab */}
        <TabsContent value="mismatched">
          <Card>
            <CardHeader>
              <CardTitle>Mismatched Payments</CardTitle>
              <CardDescription>Payments with amount discrepancies</CardDescription>
            </CardHeader>
            <CardContent>
              {mismatchedPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No mismatched payments</div>
              ) : (
                <div className="space-y-3">
                  {mismatchedPayments.map((payment: Payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                      <div className="flex-1">
                        <p className="font-medium">{payment.paymentId}</p>
                        <p className="text-sm text-gray-600">
                          {payment.resident?.fullName} - {payment.bill?.billNumber}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Discrepancy: KES {Math.abs((payment.bill?.totalAmount || 0) - payment.amount).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="destructive">MISMATCH</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orphaned Tab */}
        <TabsContent value="orphaned">
          <Card>
            <CardHeader>
              <CardTitle>Orphaned Payments</CardTitle>
              <CardDescription>Payments with no matching bill</CardDescription>
            </CardHeader>
            <CardContent>
              {orphanedPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No orphaned payments</div>
              ) : (
                <div className="space-y-3">
                  {orphanedPayments.map((payment: Payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                      <div className="flex-1">
                        <p className="font-medium">{payment.paymentId}</p>
                        <p className="text-sm text-gray-600">{payment.resident?.fullName}</p>
                        <p className="text-xs text-gray-500 mt-1">Amount: KES {payment.amount.toLocaleString()}</p>
                      </div>
                      <Badge variant="destructive">ORPHANED</Badge>
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
