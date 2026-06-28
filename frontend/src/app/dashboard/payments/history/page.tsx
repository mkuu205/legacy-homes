'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter,
  ReceiptText,
  Calendar,
  CreditCard,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { useState } from 'react';

export default function PaymentsHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await api.get('/payments/my-payments');
      return res.data.data?.payments || [];
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      // Assuming there's a delete endpoint, if not we'll need to check the API
      return await api.delete(`/payments/${paymentId}`);
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Payment deleted', description: 'The payment record has been removed.' });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast({ 
        type: 'error', 
        title: 'Delete failed', 
        description: error?.response?.data?.message || 'You cannot delete this payment record.' 
      });
    }
  });

  const filteredPayments = data?.filter((p: any) => 
    p.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return { icon: <CheckCircle size={16} className="text-[#34d399]" />, bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399' };
      case 'PENDING':
        return { icon: <Clock size={16} className="text-[#fbbf24]" />, bg: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24' };
      default:
        return { icon: <AlertCircle size={16} className="text-[#f87171]" />, bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171' };
    }
  };

  return (
    <div className="pg fu">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => router.back()} 
          className="btn-icon bg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="pg-h">Payment History</h1>
          <p className="pg-sh">View and manage your recent transactions</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" size={18} />
          <input 
            type="text" 
            placeholder="Search by Payment ID or Status..." 
            className="inp pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn bg">
          <Filter size={18} />
          Filter
        </button>
      </div>

      {/* Payments List */}
      <div className="card">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-[var(--ac)] animate-spin" />
            <p className="text-[var(--t2)] font-medium">Loading your payments...</p>
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-bottom border-[var(--bd)] text-left">
                  <th className="py-4 px-2 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider">Transaction</th>
                  <th className="py-4 px-2 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider">Amount</th>
                  <th className="py-4 px-2 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider">Status</th>
                  <th className="py-4 px-2 text-[11px] font-bold text-[var(--t3)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bd)]">
                {filteredPayments.map((p: any) => {
                  const status = getStatusDetails(p.status);
                  return (
                    <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center">
                            <CreditCard size={18} className="text-[var(--t2)]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--t1)]">{p.paymentId}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar size={12} className="text-[var(--t3)]" />
                              <span className="text-xs text-[var(--t3)]">
                                {new Date(p.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-sm font-bold text-[var(--t1)]">KES {p.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-[var(--t3)] uppercase tracking-tight mt-1">{p.provider}</p>
                      </td>
                      <td className="py-4 px-2">
                        <div 
                          className="badge" 
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.icon}
                          {p.status}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="btn-icon bg h-8 w-8"
                            onClick={() => router.push(`/dashboard/payments?paymentId=${p.id}`)}
                            title="View Receipt"
                          >
                            <ReceiptText size={16} />
                          </button>
                          <button 
                            className="btn-icon be h-8 w-8"
                            disabled={deletePaymentMutation.isPending}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this payment record?')) {
                                deletePaymentMutation.mutate(p.id);
                              }
                            }}
                            title="Delete Record"
                          >
                            {deletePaymentMutation.isPending ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center mx-auto mb-4">
              <ReceiptText size={24} className="text-[var(--t3)]" />
            </div>
            <p className="text-[var(--t1)] font-semibold mb-1">No payments found</p>
            <p className="text-[var(--t2)] text-sm mb-6">You haven&apos;t made any payments yet.</p>
            <button 
              className="btn bp"
              onClick={() => router.push('/dashboard/payments')}
            >
              Make First Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
