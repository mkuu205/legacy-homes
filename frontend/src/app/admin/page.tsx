'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Users, Gauge, FileText, CreditCard, TrendingUp, TrendingDown,
  MessageSquare, AlertCircle, ArrowRight, CheckCircle, Clock
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '256px', borderRadius: '12px' }} />
        <div className="g4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '14px' }} />
          ))}
        </div>
      </div>
    );
  }

  const d = data || {};
  const revenueGrowthPositive = (d.revenueGrowth || 0) >= 0;

  const kpis = [
    { label: 'Total Residents', value: d.totalResidents || 0, sub: `${d.activeResidents || 0} active`, icon: Users, color: 'var(--in)', href: '/admin/residents' },
    { label: 'Active Meters', value: d.totalMeters || 0, sub: 'Installed & active', icon: Gauge, color: '#a78bfa', href: '/admin/meters' },
    { label: 'Monthly Revenue', value: `KES ${(d.monthlyRevenue || 0).toLocaleString()}`, sub: `${revenueGrowthPositive ? '+' : ''}${d.revenueGrowth || 0}% vs last month`, icon: CreditCard, color: 'var(--ok)', href: '/admin/payments', trend: d.revenueGrowth },
    { label: 'Open Tickets', value: d.openTickets || 0, sub: 'Needs attention', icon: MessageSquare, color: '#fbbf24', href: '/admin/support' },
    { label: 'Total Bills', value: d.totalBills || 0, sub: `${d.paidBills || 0} paid`, icon: FileText, color: '#38bdf8', href: '/admin/billing' },
    { label: 'Unpaid Bills', value: d.unpaidBills || 0, sub: 'Pending payment', icon: AlertCircle, color: '#f87171', href: '/admin/billing' },
    { label: 'Overdue Bills', value: d.overdueBills || 0, sub: 'Past due date', icon: Clock, color: '#dc2626', href: '/admin/billing' },
    { label: 'Successful Payments', value: d.successfulPayments || 0, sub: 'All time', icon: CheckCircle, color: '#34d399', href: '/admin/payments' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">Admin Dashboard</h1>
        <p className="pg-sh">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="g4">
        {kpis.map(({ label, value, sub, icon: Icon, color, href, trend }) => (
          <Link
            key={label}
            href={href}
            className="stat card-hover"
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                className="stat-ico"
                style={{ background: `${color}20` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              {trend !== undefined && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: trend >= 0 ? '#34d399' : '#f87171',
                  }}
                >
                  {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(trend)}%
                </div>
              )}
            </div>
            <div>
              <p className="stat-val">{value}</p>
              <p className="stat-lbl">{label}</p>
              <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '4px' }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="g2">
        {/* Revenue Trend */}
        <div className="card">
          <div className="s-hd" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="pg-h" style={{ fontSize: '16px', marginBottom: '4px' }}>
                Revenue Trend
              </h2>
              <p className="pg-sh">Last 6 months</p>
            </div>
            <Link
              href="/admin/reports"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ac)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Full report <ArrowRight size={12} />
            </Link>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.revenueTrend || []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ac)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--ac)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--t3)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--t3)' }}
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--ac)"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bill Status Breakdown */}
        <div className="card">
          <div className="s-hd" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="pg-h" style={{ fontSize: '16px', marginBottom: '4px' }}>
                Bill Status
              </h2>
              <p className="pg-sh">Current breakdown</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { name: 'Paid', value: d.paidBills || 0, fill: '#34d399' },
                { name: 'Unpaid', value: d.unpaidBills || 0, fill: '#fbbf24' },
                { name: 'Overdue', value: d.overdueBills || 0, fill: '#f87171' },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--t3)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--t3)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--c2)',
                  border: '1px solid var(--bd)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--t1)',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="pg-h" style={{ fontSize: '16px', marginBottom: '16px' }}>
          Quick Actions
        </h2>
        <div className="g4">
          {[
            { label: 'Add Resident', href: '/admin/residents', icon: Users, color: 'var(--in)' },
            { label: 'Add Meter', href: '/admin/meters', icon: Gauge, color: '#a78bfa' },
            { label: 'Generate Bills', href: '/admin/billing', icon: FileText, color: 'var(--ok)' },
            { label: 'Send Notification', href: '/admin/notifications', icon: AlertCircle, color: '#fbbf24' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className="card-sm card-hover"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 12px',
                textAlign: 'center',
              }}
            >
              <div
                className="stat-ico"
                style={{ background: `${color}20` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t1)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
