'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard, FileText, Droplets, Bell, ArrowRight, TrendingUp, CheckCircle, AlertCircle, Clock, Zap, MessageSquarePlus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/residents/dashboard');
      return res.data.data;
    },
  });

  const statusBadges: Record<string, { bg: string; color: string; text: string }> = {
    PAID: { bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399', text: 'Paid' },
    PARTIAL: { bg: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', text: 'Partial' },
    UNPAID: { bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171', text: 'Unpaid' },
    OVERDUE: { bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171', text: 'Overdue' },
  };

  const statusIcons: Record<string, React.ReactNode> = {
    PAID: <CheckCircle size={16} style={{ color: '#34d399' }} />,
    PARTIAL: <Clock size={16} style={{ color: '#fbbf24' }} />,
    UNPAID: <AlertCircle size={16} style={{ color: '#f87171' }} />,
    OVERDUE: <AlertCircle size={16} style={{ color: '#f87171' }} />,
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '256px', borderRadius: '12px' }} />
        <div className="g4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '14px' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '256px', borderRadius: '14px' }} />
      </div>
    );
  }

  const { currentBill, recentPayments, unreadNotifications, consumptionHistory } = data || {};

  const chartData = (consumptionHistory || []).reverse().map((r: any) => ({
    month: r.billingMonth,
    units: r.unitsConsumed,
    amount: r.unitsConsumed * 250,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="fu">
      {/* Welcome Notification */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 198, 167, 0.12), rgba(20, 230, 212, 0.06))',
        border: '1px solid rgba(0, 198, 167, 0.25)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--ac), var(--ac-light))',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '20px' }}>👋</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>
            Welcome back, {user?.fullName?.split(' ')[0]}! 👋
          </p>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            You have {unreadNotifications || 0} unread alerts. Stay updated with your water usage.
          </p>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '8px' }}>
        <h1 className="pg-h" style={{ fontSize: '32px' }}>
          Your Account
        </h1>
        <p className="pg-sh">
          Manage your water billing and payments
        </p>
      </div>

      {/* Current Bill CTA */}
      {currentBill && (
        <div className="pay-hero" style={{
          background: 'linear-gradient(135deg, rgba(0, 198, 167, 0.15), rgba(20, 230, 212, 0.08))',
          border: '1px solid rgba(0, 198, 167, 0.25)',
          borderRadius: '16px',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--ac)', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Current Bill — {currentBill.billingMonth}
              </p>
              <p style={{ fontSize: '48px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--f1)', lineHeight: 1 }}>
                KES {currentBill.totalAmount.toLocaleString()}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--t2)', fontWeight: 500 }}>
                  Balance: <strong style={{ color: 'var(--t1)' }}>KES {currentBill.balance.toLocaleString()}</strong>
                </span>
                <div
                  className="badge b-ac"
                  style={{ fontSize: '11px' }}
                >
                  {statusBadges[currentBill.status]?.text || currentBill.status}
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '12px' }}>
                Due: <strong style={{ color: 'var(--t1)' }}>{new Date(currentBill.dueDate).toLocaleDateString('en-KE')}</strong>
              </p>
            </div>

            <Link
              href="/dashboard/payments"
              className="btn bp"
              style={{ width: 'fit-content', fontSize: '15px', fontWeight: 700, padding: '14px 28px' }}
            >
              Pay Now via M-Pesa
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {!currentBill && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))' }}>
          <CheckCircle size={48} style={{ color: 'var(--ok)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: '6px' }}>
            No outstanding bills
          </p>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            You&apos;re all caught up! Great job staying current.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="g4" style={{ marginTop: '8px' }}>
        {[
          { label: 'Unread Alerts', value: unreadNotifications || 0, icon: Bell, color: '#f59e0b', href: '/dashboard/notifications' },
          { label: 'Recent Payments', value: recentPayments?.length || 0, icon: CreditCard, color: 'var(--ok)', href: '/dashboard/payments' },
          { label: 'Bill Status', value: currentBill?.status || 'N/A', icon: FileText, color: statusBadges[currentBill?.status]?.color || 'var(--t2)', href: '/dashboard/billing' },
          { label: 'Units Used', value: currentBill ? `${currentBill.unitsConsumed}` : 'N/A', icon: Droplets, color: 'var(--in)', href: '/dashboard/billing' },
          { label: 'Support', value: 'New Ticket', icon: MessageSquarePlus, color: '#a78bfa', href: '/dashboard/support?new=true' },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="stat card-hover"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                className="stat-ico"
                style={{ background: `${color}20` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <ArrowRight size={14} style={{ color: 'var(--t3)' }} />
            </div>
            <div>
              <p className="stat-val">{value}</p>
              <p className="stat-lbl">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Consumption Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginTop: '8px' }}>
          <div className="s-hd" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="pg-h" style={{ fontSize: '18px', marginBottom: '4px' }}>
                Water Consumption
              </h2>
              <p className="pg-sh">Last 6 months</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--ok)', fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>Units consumed</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ac)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--ac)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--c2)',
                  border: '1px solid var(--bd)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--t1)',
                }}
                formatter={(v) => [`${v} units`, 'Consumed']}
              />
              <Area
                type="monotone"
                dataKey="units"
                stroke="var(--ac)"
                strokeWidth={2}
                fill="url(#colorUnits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Payments */}
      {recentPayments && recentPayments.length > 0 && (
        <div className="card" style={{ marginTop: '8px' }}>
          <div className="s-hd" style={{ marginBottom: '16px' }}>
            <h2 className="pg-h" style={{ fontSize: '18px', marginBottom: 0 }}>
              Recent Payments
            </h2>
            <Link
              href="/dashboard/payments"
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
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentPayments.slice(0, 4).map((p: any, idx: number) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: idx < recentPayments.slice(0, 4).length - 1 ? '1px solid var(--bd)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    className="stat-ico"
                    style={{
                      background: p.status === 'SUCCESSFUL' ? 'rgba(16, 185, 129, 0.14)' : p.status === 'PENDING' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      width: '36px',
                      height: '36px',
                    }}
                  >
                    {p.status === 'SUCCESSFUL' ? (
                      <CheckCircle size={18} style={{ color: '#34d399' }} />
                    ) : p.status === 'PENDING' ? (
                      <Clock size={18} style={{ color: '#fbbf24' }} />
                    ) : (
                      <AlertCircle size={18} style={{ color: '#f87171' }} />
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                      {p.paymentId}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                    KES {p.amount.toLocaleString()}
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: p.status === 'SUCCESSFUL' ? '#34d399' : p.status === 'PENDING' ? '#fbbf24' : '#f87171',
                      marginTop: '2px',
                    }}
                  >
                    {p.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
