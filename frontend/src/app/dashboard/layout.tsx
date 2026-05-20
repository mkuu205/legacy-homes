'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import {
  Droplets,
  LayoutDashboard,
  FileText,
  CreditCard,
  Bell,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/billing', icon: FileText, label: 'My Bills' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { href: '/dashboard/support', icon: MessageSquare, label: 'Support' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout({
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'RESIDENT') {
      router.push('/admin');
    }
  }, [hydrated, isAuthenticated, user, router]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { api } = await import('@/lib/api');
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data?.count || 0);
      } catch {
        setUnreadCount(0);
      }
    };

    if (isAuthenticated && user) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, user]);

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
                Resident Portal
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
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--ac)',
                  fontFamily: 'var(--f1)',
                  overflow: 'hidden',
                }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  user.fullName.charAt(0).toUpperCase()
                )}
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
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
                  House {user.houseNumber}
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
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive =
                pathname === href ||
                (href !== '/dashboard' &&
                  pathname.startsWith(href));

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sb-link ${
                    isActive ? 'on' : ''
                  }`}
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

        <div className="main-col">{children}</div>
      </div>
    </div>
  );
}
