'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Bell, CheckCheck, Info, AlertCircle, CheckCircle, Megaphone, Trash2, Eye, EyeOff } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications/my');
        return res.data.data ?? { notifications: [], unread: 0 };
      } catch {
        return { notifications: [], unread: 0 };
      }
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
      toast({ type: 'success', title: 'All notifications marked as read' });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/unread`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
      toast({ type: 'success', title: 'Notification deleted' });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to delete notification', description: getErrorMessage(err) });
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/delete-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
      toast({ type: 'success', title: 'All notifications deleted' });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Failed to delete notifications', description: getErrorMessage(err) });
    }
  });

  const typeIcons: Record<string, React.ReactNode> = {
    BILLING: <AlertCircle size={18} style={{ color: '#fbbf24' }} />,
    PAYMENT: <CheckCircle size={18} style={{ color: '#34d399' }} />,
    ANNOUNCEMENT: <Megaphone size={18} style={{ color: 'var(--ac)' }} />,
    SYSTEM: <Info size={18} style={{ color: 'var(--t2)' }} />,
    SUPPORT: <Bell size={18} style={{ color: '#a78bfa' }} />,
  };

  const typeBg: Record<string, string> = {
    BILLING: 'rgba(245, 158, 11, 0.14)',
    PAYMENT: 'rgba(16, 185, 129, 0.14)',
    ANNOUNCEMENT: 'rgba(0, 198, 167, 0.14)',
    SYSTEM: 'rgba(124, 154, 184, 0.14)',
    SUPPORT: 'rgba(139, 92, 246, 0.14)',
  };

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd">
        <div>
          <h1 className="pg-h">Notifications</h1>
          <p className="pg-sh">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="btn bg btn-sm"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all notifications?')) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
              className="btn bg btn-sm"
              style={{ color: '#f87171' }}
            >
              <Trash2 size={14} />
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <Bell size={48} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>
            No notifications yet
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
            You'll be notified about bills, payments, and announcements
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n: any) => {
            const notif = n.notification;
            const isUnread = n.status !== 'READ';
            const type = notif?.type || 'SYSTEM';
            return (
              <div
                key={n.id}
                onClick={() => isUnread && markOneMutation.mutate(n.notificationId)}
                className="card card-hover"
                style={{
                  padding: '16px',
                  cursor: isUnread ? 'pointer' : 'default',
                  borderLeft: isUnread ? '3px solid var(--ac)' : 'none',
                  paddingLeft: isUnread ? '13px' : '16px',
                  background: isUnread ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Icon */}
                  <div
                    className="stat-ico"
                    style={{
                      background: typeBg[type] || typeBg.SYSTEM,
                      width: '40px',
                      height: '40px',
                      flexShrink: 0,
                    }}
                  >
                    {typeIcons[type] || typeIcons.SYSTEM}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: isUnread ? 700 : 600, color: 'var(--t1)' }}>
                        {notif?.title}
                      </p>
                      {isUnread && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--ac)',
                            flexShrink: 0,
                            marginTop: '4px',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '6px' }}>
                      {notif?.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
                        {new Date(n.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markUnreadMutation.mutate(n.notificationId);
                          }}
                          disabled={markUnreadMutation.isPending}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--t2)', fontSize: '12px' }}
                        >
                          {isUnread ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOneMutation.mutate(n.id);
                          }}
                          disabled={deleteOneMutation.isPending}
                          title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#f87171', fontSize: '12px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
