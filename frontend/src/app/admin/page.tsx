'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Gauge, FileText, CreditCard, TrendingUp, TrendingDown,
  MessageSquare, AlertCircle, ArrowUpRight, CheckCircle, Clock,
  Activity, Zap, ShieldCheck, WalletCards, BellRing, ArrowRight,
} from 'lucide-react';

const chartColors = ['#a855f7', '#5b5cf0', '#e879f9'];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((value, index) => `${(index / (data.length - 1)) * 100},${42 - (value / max) * 34}`).join(' ');
  return (
    <svg viewBox="0 0 100 46" preserveAspectRatio="none" className="admin-sparkline" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,46 ${points} 100,46`} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return <div className="admin-dashboard admin-loading"><div className="admin-hero-skeleton" /><div className="admin-stat-grid">{[...Array(4)].map((_, i) => <div className="admin-stat-skeleton" key={i} />)}</div><div className="admin-content-skeleton" /></div>;
  }

  const d = data || {};
  const revenueGrowth = Number(d.revenueGrowth || 0);
  const trend = (d.revenueTrend || []).map((item: { revenue: number }) => item.revenue);
  const revenueData = d.revenueTrend || [];
  const billStatus = [
    { name: 'Paid', value: d.paidBills || 0 },
    { name: 'Unpaid', value: d.unpaidBills || 0 },
    { name: 'Overdue', value: d.overdueBills || 0 },
  ];
  const totalStatus = billStatus.reduce((sum, item) => sum + item.value, 0);
  const health = totalStatus ? Math.round(((d.paidBills || 0) / totalStatus) * 100) : 0;
  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });
  const spark = trend.length >= 2 ? trend : [18, 28, 22, 36, 30, 44, 38];
  const kpis = [
    { label: 'Total Residents', value: (d.totalResidents || 0).toLocaleString(), meta: `${d.activeResidents || 0} active accounts`, color: '#a855f7', icon: Users, href: '/admin/residents', data: spark },
    { label: 'Active Meters', value: (d.totalMeters || 0).toLocaleString(), meta: 'Installed & reporting', color: '#22d3ee', icon: Gauge, href: '/admin/meters', data: [22, 30, 28, 42, 36, 48, 55] },
    { label: 'Monthly Revenue', value: `KES ${(d.monthlyRevenue || 0).toLocaleString()}`, meta: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs last month`, color: '#d946ef', icon: WalletCards, href: '/admin/payments', data: spark.map((value: number, i: number) => value + (i % 3) * 6), trend: revenueGrowth },
    { label: 'Open Tickets', value: (d.openTickets || 0).toLocaleString(), meta: 'Needs attention', color: '#818cf8', icon: MessageSquare, href: '/admin/support', data: [30, 24, 34, 28, 38, 30, 44] },
  ];

  const activities = [
    { icon: Users, color: '#a855f7', title: `${d.activeResidents || 0} active residents`, detail: 'Accounts ready for service', href: '/admin/residents' },
    { icon: FileText, color: '#22d3ee', title: `${d.totalBills || 0} bills in the system`, detail: `${d.unpaidBills || 0} currently need payment`, href: '/admin/billing' },
    { icon: CheckCircle, color: '#34d399', title: `${d.successfulPayments || 0} successful payments`, detail: 'Confirmed transactions', href: '/admin/payments' },
    { icon: BellRing, color: '#fbbf24', title: `${d.openTickets || 0} open support tickets`, detail: 'Review resident requests', href: '/admin/support' },
  ];

  return (
    <div className="admin-dashboard fu">
      <section className="admin-welcome-row">
        <div>
          <p className="admin-eyebrow"><span className="admin-live-dot" /> SYSTEM OVERVIEW</p>
          <h1>Good morning, <span>{'Administrator'}</span></h1>
          <p className="admin-subtitle">Here&apos;s what&apos;s happening across Legacy Homes today, {today}.</p>
        </div>
        <Link href="/admin/reports" className="admin-outline-button"><Activity size={15} /> View reports <ArrowUpRight size={14} /></Link>
      </section>

      {isError && <div className="admin-error-banner"><AlertCircle size={17} /> Dashboard data could not be refreshed. Existing operational pages remain available.</div>}

      <section className="admin-stat-grid">
        {kpis.map(({ label, value, meta, color, icon: Icon, href, data: sparkData, trend: cardTrend }) => (
          <Link href={href} key={label} className="admin-stat-card" style={{ '--accent': color } as React.CSSProperties}>
            <div className="admin-stat-top"><span className="admin-stat-icon"><Icon size={18} /></span>{cardTrend !== undefined && <span className={cardTrend >= 0 ? 'admin-positive' : 'admin-negative'}>{cardTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(cardTrend).toFixed(1)}%</span>}</div>
            <p className="admin-stat-label">{label}</p>
            <strong className="admin-stat-value">{value}</strong>
            <div className="admin-stat-bottom"><span>{meta}</span><Sparkline data={sparkData} color={color} /></div>
          </Link>
        ))}
      </section>

      <section className="admin-main-grid">
        <div className="admin-panel admin-overview-panel">
          <div className="admin-panel-heading"><div><p className="admin-eyebrow">REAL-TIME MONITORING</p><h2>Operations overview</h2></div><span className="admin-period"><Zap size={13} /> Last 6 months</span></div>
          <div className="admin-overview-body">
            <div className="admin-health-stack">
              <div><span>Collection health</span><strong>{health}%</strong><small>Paid bill ratio</small></div>
              <Sparkline data={spark} color="#a855f7" />
              <div><span>Service load</span><strong>{d.pendingPayments || 0}</strong><small>Pending payments</small></div>
              <Sparkline data={[12, 18, 16, 24, 20, 30, 28]} color="#22d3ee" />
              <div><span>Network status</span><strong className="admin-online">ONLINE</strong><small>All systems operational</small></div>
            </div>
            <div className="admin-glow-orb"><div className="admin-orb-core"><ShieldCheck size={42} /></div><div className="admin-orb-ring admin-orb-ring-one" /><div className="admin-orb-ring admin-orb-ring-two" /></div>
            <div className="admin-status-bars"><p>Bill status</p>{billStatus.map((item, index) => <div className="admin-bar-row" key={item.name}><span><i style={{ background: chartColors[index] }} />{item.name}</span><strong>{item.value}</strong><div className="admin-bar-track"><div style={{ width: `${totalStatus ? (item.value / totalStatus) * 100 : 0}%`, background: chartColors[index] }} /></div></div>)}</div>
          </div>
        </div>

        <div className="admin-panel admin-activity-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">AUDIT STREAM</p><h2>Recent activity</h2></div><Link href="/admin/audit-logs">View all <ArrowRight size={13} /></Link></div><div className="admin-activity-list">{activities.map(({ icon: Icon, color, title, detail, href }) => <Link className="admin-activity-item" href={href} key={title}><span className="admin-activity-icon" style={{ color, background: `${color}18` }}><Icon size={16} /></span><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={14} /></Link>)}</div></div>
      </section>

      <section className="admin-bottom-grid">
        <div className="admin-panel admin-chart-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">FINANCIAL PERFORMANCE</p><h2>Revenue trend</h2></div><Link href="/admin/reports">Full report <ArrowRight size={13} /></Link></div><ResponsiveContainer width="100%" height={250}><AreaChart data={revenueData}><defs><linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} /><stop offset="100%" stopColor="#a855f7" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.10)" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7d789d' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#7d789d' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ background: '#13112b', border: '1px solid rgba(168,85,247,.35)', borderRadius: 10, color: '#f7f3ff', fontSize: 12 }} formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']} /><Area type="monotone" dataKey="revenue" stroke="#c084fc" strokeWidth={3} fill="url(#adminRevenueGradient)" /></AreaChart></ResponsiveContainer></div>
        <div className="admin-panel admin-donut-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">BILLING MIX</p><h2>Bill status</h2></div><Link href="/admin/billing">Manage <ArrowRight size={13} /></Link></div><div className="admin-donut-wrap"><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={billStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={82} paddingAngle={4} stroke="none"><Cell fill="#a855f7" /><Cell fill="#5b5cf0" /><Cell fill="#e879f9" /></Pie></PieChart></ResponsiveContainer><div className="admin-donut-label"><strong>{totalStatus}</strong><span>Total</span></div></div><div className="admin-legend">{billStatus.map((item, index) => <span key={item.name}><i style={{ background: chartColors[index] }} />{item.name} <b>{item.value}</b></span>)}</div></div>
        <div className="admin-panel admin-quick-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">SHORTCUTS</p><h2>Quick actions</h2></div></div><div className="admin-quick-list"><Link href="/admin/billing" className="admin-quick-action"><FileText size={17} /><span>Generate bills</span><ArrowRight size={14} /></Link><Link href="/admin/residents" className="admin-quick-action"><Users size={17} /><span>Manage residents</span><ArrowRight size={14} /></Link><Link href="/admin/notifications" className="admin-quick-action"><BellRing size={17} /><span>Send notification</span><ArrowRight size={14} /></Link><Link href="/admin/system-check" className="admin-quick-action"><ShieldCheck size={17} /><span>System check</span><ArrowRight size={14} /></Link></div></div>
      </section>
    </div>
  );
}
