'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import {
  Droplets,
  LayoutDashboard,
  Users,
  Gauge,
  FileText,
  CreditCard,
  Bell,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/admin/residents', icon: Users, label: 'Residents' },
  { href: '/admin/meters', icon: Gauge, label: 'Meters' },
  { href: '/admin/billing', icon: FileText, label: 'Billing' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { href: '/admin/support', icon: MessageSquare, label: 'Support' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    user,
    isAuthenticated,
    logout,
    hydrated,
  } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [hydrated, isAuthenticated, user, router]);

  const handleLogout = async () => {
    try {
      const refreshToken =
        sessionStorage.getItem('refreshToken');

      if (refreshToken) {
        const { api } = await import('@/lib/api');

        await api.post('/auth/logout', {
          refreshToken,
        });
      }
    } catch {}

    logout();
    router.push('/');
  };

  if (!hydrated || !isAuthenticated || !user) {
    return null;
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="dashboard-container">
      <div className="shell">
        <aside
          className={`sb fixed inset-y-0 left-0 z-50 lg:static lg:inset-auto transition-transform duration-300 ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="sb-logo">
            <div className="sb-logo-icon">
              <Droplets size={18} style={{ color: 'var(--ac)' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--t1)',
                  fontFamily: 'var(--f1)',
                }}
              >
                Legacy Homes
              </div>

              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--t3)',
                  marginTop: '1px',
                }}
              >
                Admin Panel
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t2)',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="sb-user-card"
            style={{ margin: '12px 8px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'var(--gl)',
                  border:
                    '1px solid rgba(0, 198, 167, 0.25)',
                  color: 'var(--ac)',
                  overflow: 'hidden',
                }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Shield size={18} />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--t1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.fullName}
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--t3)',
                    marginTop: '2px',
                  }}
                >
                  {user.role}
                </div>
              </div>
            </div>
          </div>

          <nav
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            {navItems.map(({ href, icon: Icon, label, exact }) => {
              const active = isActive(href, exact);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sb-link ${active ? 'on' : ''}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sb-foot">
            <button
              onClick={handleLogout}
              className="sb-link"
              style={{
                width: '100%',
                color: '#f87171',
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="main-col">
          <div className="topbar">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
                Admin
              </p>
            </div>
          </div>

          <div className="pg">{children}</div>
        </div>
      </div>
    </div>
  );
}
