'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, Download, TrendingUp, AlertCircle, Droplets, Loader2 } from 'lucide-react';

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'billing' | 'overdue' | 'consumption'>('revenue');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      let endpoint = '';
      let filename = 'report.csv';
      if (activeTab === 'revenue') {
        endpoint = `/reports/export/revenue?year=${year}`;
        filename = `revenue-report-${year}.csv`;
      } else if (activeTab === 'overdue') {
        endpoint = '/reports/export/overdue';
        filename = 'overdue-report.csv';
      } else if (activeTab === 'billing') {
        endpoint = '/reports/export/billing';
        filename = 'billing-report.csv';
      } else {
        toast({ type: 'error', title: 'Export not available for this tab' });
        setIsExporting(false);
        return;
      }
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'Report exported successfully!' });
    } catch (error) {
      toast({ type: 'error', title: 'Failed to export report' });
    } finally {
      setIsExporting(false);
    }
  };

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['revenue-report', year],
    queryFn: async () => {
      const res = await api.get(`/reports/revenue?year=${year}`);
      return res.data.data;
    },
    enabled: activeTab === 'revenue',
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-report'],
    queryFn: async () => {
      const res = await api.get('/reports/overdue');
      return res.data.data;
    },
    enabled: activeTab === 'overdue',
  });

  const { data: consumptionData } = useQuery({
    queryKey: ['consumption-report'],
    queryFn: async () => {
      const res = await api.get('/reports/consumption');
      return res.data.data;
    },
    enabled: activeTab === 'consumption',
  });

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'billing', label: 'Billing', icon: BarChart3 },
    { id: 'overdue', label: 'Overdue', icon: AlertCircle },
    { id: 'consumption', label: 'Consumption', icon: Droplets },
  ];

  const revenueChartData = revenueData
    ? Object.entries(revenueData.byMonth)
        .sort(([a], [b]) => a.localeCompare(b)) // chronological sort by YYYY-MM
        .map(([month, revenue]) => ({ month: month.slice(5), revenue }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd">
        <div>
          <h1 className="pg-h">Reports</h1>
          <p className="pg-sh">Analytics and financial reports</p>
        </div>
        <button 
          onClick={exportToCSV}
          disabled={isExporting}
          className="btn bg btn-sm"
        >
          {isExporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`tab ${activeTab === id ? 'on' : ''}`}
          >
            <Icon size={14} style={{ marginRight: '4px' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Revenue Report */}
      {activeTab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="sel"
              style={{ minWidth: '120px' }}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {revenueData && (
            <>
              <div className="g3">
                <div className="stat card">
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ok)', marginBottom: '4px' }}>
                    KES {(revenueData.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Total Revenue {year}
                  </p>
                </div>
                <div className="stat card">
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--in)', marginBottom: '4px' }}>
                    {revenueData.payments?.length || 0}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Successful Transactions
                  </p>
                </div>
                <div className="stat card">
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa', marginBottom: '4px' }}>
                    KES {revenueData.payments?.length > 0 ? Math.round(revenueData.totalRevenue / revenueData.payments.length).toLocaleString() : 0}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Average Transaction
                  </p>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '16px', fontFamily: 'var(--f1)' }}>
                  Monthly Revenue — {year}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'var(--t3)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--t3)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--c2)',
                        border: '1px solid var(--bd)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: 'var(--t1)',
                      }}
                      formatter={(v) => [`KES ${(v as number).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="var(--ac)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Overdue Report */}
      {activeTab === 'overdue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {overdueData && (
            <div className="g2">
              <div className="stat card">
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  {overdueData.total || 0}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Overdue Bills
                </p>
              </div>
              <div className="stat card">
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  KES {(overdueData.totalOutstanding || 0).toLocaleString()}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Total Outstanding
                </p>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                    {['Resident', 'House', 'Bill No.', 'Month', 'Balance', 'Due Date', 'Days Overdue'].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--t2)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overdueLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                        {[...Array(7)].map((_, j) => (
                          <td key={j} style={{ padding: '12px 16px' }}>
                            <div className="skeleton" style={{ height: '16px', borderRadius: '4px' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : overdueData?.bills?.map((b: any) => {
                    const daysOverdue = Math.floor((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: '1px solid var(--bd)',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                            {b.resident?.fullName}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>
                            {b.resident?.phone}
                          </p>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                          {b.resident?.houseNumber}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--t1)' }}>
                          {b.billNumber}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                          {b.billingMonth}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#f87171' }}>
                          KES {b.balance.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--t2)' }}>
                          {new Date(b.dueDate).toLocaleDateString('en-KE')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="badge" style={{ background: 'rgba(248, 113, 113, 0.14)', color: '#f87171', fontSize: '10px' }}>
                            {daysOverdue} days
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Consumption Report */}
      {activeTab === 'consumption' && consumptionData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="g3">
            <div className="stat card">
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--in)', marginBottom: '4px' }}>
                {consumptionData.totalUnits?.toFixed(1)}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Total Units
              </p>
            </div>
            <div className="stat card">
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ok)', marginBottom: '4px' }}>
                {consumptionData.avgUnits?.toFixed(1)}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Avg Units/Meter
              </p>
            </div>
            <div className="stat card">
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa', marginBottom: '4px' }}>
                {consumptionData.count}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Active Meters
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
