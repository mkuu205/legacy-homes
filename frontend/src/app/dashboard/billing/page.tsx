'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import Link from 'next/link';
import { FileText, Download, ArrowRight, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  PAID: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', icon: <CheckCircle size={16} />, label: 'Paid' },
  PARTIAL: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', icon: <Clock size={16} />, label: 'Partial' },
  UNPAID: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', icon: <AlertCircle size={16} />, label: 'Unpaid' },
  OVERDUE: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', icon: <AlertCircle size={16} />, label: 'Overdue' },
};

export default function BillingPage() {
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  const handleDownloadInvoice = async (billId: string) => {
    setDownloadingBillId(billId);
    try {
      const res = await api.get(`/billing/${billId}/invoice`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'Invoice downloaded successfully!' });
    } catch (error) {
      toast({ type: 'error', title: 'Failed to download invoice' });
    } finally {
      setDownloadingBillId(null);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '192px', borderRadius: '12px' }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '96px', borderRadius: '14px' }} />
        ))}
      </div>
    );
  }

  const { bills } = data || { bills: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">My Bills</h1>
        <p className="pg-sh">View and download your billing history</p>
      </div>

      {/* Empty State */}
      {bills.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <FileText size={48} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>
            No bills yet
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
            Your billing history will appear here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bills.map((bill: any) => {
            const status = statusConfig[bill.status] || statusConfig.UNPAID;
            return (
              <div
                key={bill.id}
                className="card card-hover"
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  {/* Left Section */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div
                      className="stat-ico"
                      style={{
                        background: status.bg,
                        width: '40px',
                        height: '40px',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: status.color }}>{status.icon}</span>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                          {bill.billNumber}
                        </p>
                        <div
                          className="badge"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </div>
                      </div>

                      <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '8px' }}>
                        {bill.billingMonth} · Meter: {bill.meter?.meterNumber}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--t3)' }}>
                        <span>{bill.unitsConsumed} units × KES 250</span>
                        <span>Due: {new Date(bill.dueDate).toLocaleDateString('en-KE')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--f1)' }}>
                      KES {bill.totalAmount.toLocaleString()}
                    </p>
                    {bill.balance > 0 && (
                      <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 600 }}>
                        Balance: KES {bill.balance.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {bill.status !== 'PAID' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--bd)' }}>
                    <Link
                      href={`/dashboard/payments?billId=${bill.id}`}
                      className="btn bp btn-sm"
                    >
                      Pay Now <ArrowRight size={14} />
                    </Link>
                    <button 
                      onClick={() => handleDownloadInvoice(bill.id)}
                      disabled={downloadingBillId === bill.id}
                      className="btn bg btn-sm"
                    >
                      {downloadingBillId === bill.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                      {downloadingBillId === bill.id ? 'Downloading...' : 'Invoice'}
                    </button>
                  </div>
                )}

                {bill.status === 'PAID' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--bd)' }}>
                    <button 
                      onClick={() => handleDownloadInvoice(bill.id)}
                      disabled={downloadingBillId === bill.id}
                      className="btn bg btn-sm"
                    >
                      {downloadingBillId === bill.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                      {downloadingBillId === bill.id ? 'Downloading...' : 'Download Receipt'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
