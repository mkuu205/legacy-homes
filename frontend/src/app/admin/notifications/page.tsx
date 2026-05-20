'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import {
  Bell,
  Send,
  Loader2,
  Users,
  AlertCircle,
  Megaphone,
  Wrench,
  Droplets,
  CreditCard,
  Trash2,
} from 'lucide-react';

const NOTIFICATION_TYPES = [
  {
    value: 'ESTATE_COMMUNICATION',
    label: 'Estate Communication',
    icon: <Megaphone size={14} />,
  },
  {
    value: 'BILLING_REMINDER',
    label: 'Billing Reminder',
    icon: <CreditCard size={14} />,
  },
  {
    value: 'BILLING_ALERT',
    label: 'Billing Alert',
    icon: <AlertCircle size={14} />,
  },
  {
    value: 'WATER_OUTAGE',
    label: 'Water Outage',
    icon: <Droplets size={14} />,
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance',
    icon: <Wrench size={14} />,
  },
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    icon: <Bell size={14} />,
  },
];

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'ESTATE_COMMUNICATION',
    channels: ['IN_APP', 'EMAIL'],
    targetAll: true,
    targetGroup: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post('/notifications/send', payload);
      return res.data.data;
    },

    onSuccess: (data) => {
      toast({
        type: 'success',
        title: 'Notification sent!',
        description: `Sent to ${data.sent} residents.`,
      });

      setForm({
        title: '',
        message: '',
        type: 'ESTATE_COMMUNICATION',
        channels: ['IN_APP', 'EMAIL'],
        targetAll: true,
        targetGroup: '',
      });

      queryClient.invalidateQueries({
        queryKey: ['admin-notifications'],
      });
    },

    onError: (error) => {
      toast({
        type: 'error',
        title: 'Failed',
        description: getErrorMessage(error),
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/admin/delete-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast({ type: 'success', title: 'All sent notifications deleted' });
    },
    onError: (error) => {
      toast({ type: 'error', title: 'Failed to delete notifications', description: getErrorMessage(error) });
    }
  });

  const toggleChannel = (channel: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const typeIcons: Record<string, React.ReactNode> = Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t.value, t.icon])
  );

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      className="fu"
    >
      <div>
        <h1 className="pg-h">Notifications</h1>
        <p className="pg-sh">Broadcast messages to residents</p>
      </div>

      <div className="g2">
        <div className="card">
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--t1)',
              marginBottom: '16px',
              fontFamily: 'var(--f1)',
            }}
          >
            Send Notification
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div className="fg">
              <label className="lbl">Type</label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="sel"
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lbl">Title</label>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Notification title..."
                className="inp"
              />
            </div>

            <div className="fg">
              <label className="lbl">Message</label>

              <textarea
                value={form.message}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                placeholder="Write your message..."
                rows={4}
                className="inp"
                style={{ resize: 'none' }}
              />
            </div>

            <div className="fg">
              <label className="lbl">Channels</label>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {['IN_APP', 'EMAIL', 'SMS'].map((channel) => (
                  <button
                    type="button"
                    key={channel}
                    onClick={() => toggleChannel(channel)}
                    className="btn"
                    style={{
                      background: form.channels.includes(channel)
                        ? 'var(--ac)'
                        : 'var(--c2)',
                      color: form.channels.includes(channel)
                        ? 'white'
                        : 'var(--t1)',
                      border: form.channels.includes(channel)
                        ? 'none'
                        : '1px solid var(--bd)',
                      fontSize: '11px',
                      padding: '6px 12px',
                    }}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="fg">
              <label className="lbl">Target Audience</label>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--t1)',
                  }}
                >
                  <input
                    type="radio"
                    checked={form.targetAll}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        targetAll: true,
                        targetGroup: '',
                      }))
                    }
                  />
                  <Users size={14} />
                  All Active Residents
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--t1)',
                  }}
                >
                  <input
                    type="radio"
                    checked={
                      !form.targetAll &&
                      form.targetGroup === 'overdue'
                    }
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        targetAll: false,
                        targetGroup: 'overdue',
                      }))
                    }
                  />
                  <AlertCircle size={14} />
                  Residents with Overdue Bills
                </label>
              </div>
            </div>

            <button
              onClick={() => sendMutation.mutate(form)}
              disabled={
                sendMutation.isPending ||
                !form.title ||
                !form.message ||
                form.channels.length === 0
              }
              className="btn bp"
              style={{ width: '100%' }}
            >
              {sendMutation.isPending ? (
                <Loader2
                  size={14}
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                />
              ) : (
                <Send size={14} />
              )}

              Send Notification
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--t1)',
                marginBottom: 0,
                fontFamily: 'var(--f1)',
              }}
            >
              Sent History
            </h2>
            {data?.notifications?.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all sent history? This will also remove them from resident dashboards.')) {
                    deleteAllMutation.mutate();
                  }
                }}
                disabled={deleteAllMutation.isPending}
                className="btn btn-sm"
                style={{ color: '#f87171', padding: '4px 8px', fontSize: '11px' }}
              >
                <Trash2 size={12} />
                Delete All
              </button>
            )}
          </div>

          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{
                    height: '64px',
                    borderRadius: '9px',
                  }}
                />
              ))}
            </div>
          ) : data?.notifications?.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
              }}
            >
              <Bell
                size={40}
                style={{
                  color: 'var(--t2)',
                  margin: '0 auto 12px',
                  display: 'block',
                  opacity: 0.4,
                }}
              />
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--t2)',
                }}
              >
                No notifications sent yet
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '384px',
                overflowY: 'auto',
              }}
            >
              {data.notifications.map((n: any) => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px',
                    borderRadius: '9px',
                    border: '1px solid var(--bd)',
                    background: 'var(--c2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,198,167,0.15)',
                        color: 'var(--ac)',
                      }}
                    >
                      {typeIcons[n.type] || <Bell size={14} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--t1)',
                        }}
                      >
                        {n.title}
                      </p>

                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--t2)',
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
