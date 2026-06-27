'use client';

import { useState } from 'react';
import { Bell, Moon, Sun, Globe, Shield, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function ResidentSettingsPage() {
  const { user } = useAuthStore();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: checked ? 'var(--ac)' : 'var(--bd)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );

  const SettingRow = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 0',
        borderBottom: '1px solid var(--bd)',
      }}
    >
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: description ? '2px' : 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: '12px', color: 'var(--t2)' }}>{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
      <div>
        <h1 className="pg-h">Settings</h1>
        <p className="pg-sh">Manage your notification preferences and account settings</p>
      </div>

      {/* Notification Channels */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Bell size={18} style={{ color: 'var(--ac)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>Notification Channels</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '8px' }}>
          Choose how you receive notifications from Legacy Homes.
        </p>
        <SettingRow
          label="Email Notifications"
          description={`Sent to ${user?.email || 'your email'}`}
          checked={emailNotifications}
          onChange={setEmailNotifications}
        />
        <SettingRow
          label="SMS Notifications"
          description={`Sent to ${user?.phone || 'your phone'}`}
          checked={smsNotifications}
          onChange={setSmsNotifications}
        />
        <SettingRow
          label="In-App Notifications"
          description="Shown in the notification bell"
          checked={inAppNotifications}
          onChange={setInAppNotifications}
        />
      </div>

      {/* Notification Types */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Smartphone size={18} style={{ color: 'var(--ac)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>Notification Types</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '8px' }}>
          Choose which events trigger notifications.
        </p>
        <SettingRow
          label="Bill Reminders"
          description="Notified when a new bill is generated or due soon"
          checked={billReminders}
          onChange={setBillReminders}
        />
        <SettingRow
          label="Payment Alerts"
          description="Notified on successful, failed, or pending payments"
          checked={paymentAlerts}
          onChange={setPaymentAlerts}
        />
        <SettingRow
          label="Maintenance & Outage Alerts"
          description="Notified about water outages and scheduled maintenance"
          checked={maintenanceAlerts}
          onChange={setMaintenanceAlerts}
        />
      </div>

      {/* Timezone */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Globe size={18} style={{ color: 'var(--ac)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>Timezone</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--c3)', border: '1px solid var(--bd)' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>Africa/Nairobi</p>
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>East Africa Time (EAT) — UTC+3</p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ac)', background: 'var(--gl)', padding: '3px 10px', borderRadius: '20px' }}>
            ACTIVE
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '8px' }}>
          All dates and times are displayed in Africa/Nairobi timezone.
        </p>
      </div>

      {/* Security Info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Shield size={18} style={{ color: 'var(--ac)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>Security</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>
          Manage your account security settings from your{' '}
          <a href="/dashboard/profile" style={{ color: 'var(--ac)', fontWeight: 600, textDecoration: 'none' }}>
            Profile page
          </a>
          . You can change your password or delete your account there.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Two-Factor Authentication', status: 'Coming soon' },
            { label: 'Active Sessions', status: 'Coming soon' },
          ].map(({ label, status }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--c3)', border: '1px solid var(--bd)' }}>
              <p style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 500 }}>{label}</p>
              <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
