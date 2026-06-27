'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Settings, Loader2, Save, DollarSign, Bell, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'billing' | 'notifications' | 'security'>('billing');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data.data;
    },
  });

  const [billingSettings, setBillingSettings] = useState({
    unitRate: 250,
    standingCharge: 200,
    vatRate: 16,
    latePenaltyRate: 5,
    gracePeriodDays: 7,
    billingCycleDay: 1,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put('/admin/settings', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Settings saved!' });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(error) }),
  });

  const tabs = [
    { id: 'billing', label: 'Billing Rates', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">System Settings</h1>
        <p className="pg-sh">Configure billing rates and system preferences</p>
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

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="card">
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '16px', fontFamily: 'var(--f1)' }}>
            Billing Rate Configuration
          </h2>

          <div className="g2" style={{ marginBottom: '16px' }}>
            {[
              { key: 'unitRate', label: 'Unit Rate (KES per m³)', min: 1 },
              { key: 'standingCharge', label: 'Standing Charge (KES)', min: 0 },
              { key: 'vatRate', label: 'VAT Rate (%)', min: 0, max: 100 },
              { key: 'latePenaltyRate', label: 'Late Penalty Rate (%)', min: 0, max: 100 },
              { key: 'gracePeriodDays', label: 'Grace Period (Days)', min: 0 },
              { key: 'billingCycleDay', label: 'Billing Cycle Day (1-28)', min: 1, max: 28 },
            ].map(({ key, label, min, max }) => (
              <div key={key} className="fg">
                <label className="lbl">{label}</label>
                <input
                  type="number"
                  value={(billingSettings as any)[key]}
                  onChange={e => setBillingSettings(s => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                  min={min}
                  max={max}
                  className="inp"
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div
            style={{
              padding: '12px',
              borderRadius: '9px',
              background: 'var(--c2)',
              border: '1px solid var(--bd)',
              marginBottom: '16px',
            }}
          >
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
              Bill Preview (10 units consumed)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              {[
                { label: 'Water Charge (10 × KES ' + billingSettings.unitRate + ')', value: 10 * billingSettings.unitRate },
                { label: 'Standing Charge', value: billingSettings.standingCharge },
                { label: `VAT (${billingSettings.vatRate}%)`, value: Math.round((10 * billingSettings.unitRate + billingSettings.standingCharge) * billingSettings.vatRate / 100) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--t1)' }}>
                  <span style={{ color: 'var(--t2)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>KES {value.toLocaleString()}</span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  paddingTop: '6px',
                  borderTop: '1px solid var(--bd)',
                  color: 'var(--ac)',
                }}
              >
                <span>Total</span>
                <span>
                  KES {(10 * billingSettings.unitRate + billingSettings.standingCharge + Math.round((10 * billingSettings.unitRate + billingSettings.standingCharge) * billingSettings.vatRate / 100)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => updateSettingsMutation.mutate({ billing: billingSettings })}
            disabled={updateSettingsMutation.isPending}
            className="btn bp"
          >
            {updateSettingsMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Save Settings
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '16px', fontFamily: 'var(--f1)' }}>
            Notification Preferences
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'billGenerated', label: 'Bill Generated', desc: 'Notify residents when a new bill is generated' },
              { key: 'paymentReceived', label: 'Payment Received', desc: 'Notify residents when payment is confirmed' },
              { key: 'overdueReminder', label: 'Overdue Reminder', desc: 'Send reminders for overdue bills' },
              { key: 'meterReading', label: 'Meter Reading', desc: 'Notify when meter reading is recorded' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '9px',
                  border: '1px solid var(--bd)',
                  background: 'var(--c2)',
                }}
              >
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>
                    {desc}
                  </p>
                </div>
                <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: 0,
                      height: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: 'var(--ac)',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        background: 'white',
                        transition: 'left 0.2s',
                      }}
                    />
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '16px', fontFamily: 'var(--f1)' }}>
            Security Settings
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                background: 'rgba(251, 191, 36, 0.08)',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                Two-Factor Authentication
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                OTP-based 2FA is enabled for all admin accounts by default.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                background: 'rgba(34, 197, 94, 0.08)',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ok)' }}>
                Session Management
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                JWT tokens expire after 15 minutes. Refresh tokens valid for 7 days.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid rgba(0, 198, 167, 0.3)',
                background: 'rgba(0, 198, 167, 0.08)',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ac)' }}>
                Audit Logging
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                All admin actions are logged with timestamps and IP addresses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
