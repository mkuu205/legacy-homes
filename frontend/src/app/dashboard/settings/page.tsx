'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Globe, Shield, Smartphone, Loader2 } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth.store';

export default function ResidentSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [manageTwoFactor, setManageTwoFactor] = useState(false);
  const canManageTwoFactor = Boolean(user && user.role !== 'RESIDENT');

  const { data: twoFactorData, isLoading: twoFactorLoading, error: twoFactorError } = useQuery({
    queryKey: ['dashboard-two-factor-status', user?.id],
    queryFn: async () => (await api.get('/auth/2fa/status')).data.data,
    enabled: canManageTwoFactor,
  });

  const setupTwoFactorMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/2fa/setup')).data.data,
    onSuccess: (data) => {
      setSetupData(data);
      toast({ type: 'success', title: 'Setup ready', description: 'Scan the QR code, then confirm with your authenticator code.' });
    },
    onError: (error) => toast({ type: 'error', title: '2FA setup failed', description: getErrorMessage(error) }),
  });

  const confirmTwoFactorMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/2fa/confirm', { code: verificationCode })).data.data,
    onSuccess: () => {
      setSetupData(null);
      setVerificationCode('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-two-factor-status', user?.id] });
      toast({ type: 'success', title: '2FA enabled', description: 'Your account is now protected with two-factor authentication.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Invalid verification code', description: getErrorMessage(error) }),
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: async () => (await api.post('/auth/2fa/disable', { code: verificationCode })).data.data,
    onSuccess: () => {
      setVerificationCode('');
      setManageTwoFactor(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-two-factor-status', user?.id] });
      toast({ type: 'success', title: '2FA disabled' });
    },
    onError: (error) => toast({ type: 'error', title: 'Unable to disable 2FA', description: getErrorMessage(error) }),
  });

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--c3)', border: '1px solid var(--bd)' }}>
            <p style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 600 }}>Two-Factor Authentication</p>
            {!canManageTwoFactor ? (
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>Two-factor authentication is managed for administrator accounts.</p>
            ) : twoFactorLoading ? (
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>Checking your 2FA status…</p>
            ) : twoFactorError ? (
              <p style={{ fontSize: '12px', color: 'var(--danger, #ef4444)', marginTop: '4px' }}>{getErrorMessage(twoFactorError)}</p>
            ) : twoFactorData?.enabled ? (
              <>
                <p style={{ fontSize: '12px', color: 'var(--ok)', fontWeight: 700, marginTop: '4px' }}>Enabled</p>
                <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>Your account is protected with two-factor authentication.</p>
                <button type="button" className="btn bg" style={{ marginTop: '10px' }} onClick={() => setManageTwoFactor(value => !value)}>
                  {manageTwoFactor ? 'Close 2FA management' : 'Manage 2FA'}
                </button>
                {manageTwoFactor && <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--t2)' }}>{twoFactorData.recoveryCodesRemaining} recovery codes remain. Enter an authenticator or recovery code to disable 2FA.</p>
                  <input className="inp" style={{ marginTop: '8px' }} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="Authenticator or recovery code" inputMode="numeric" />
                  <button type="button" className="btn bg" style={{ marginTop: '8px' }} onClick={() => disableTwoFactorMutation.mutate()} disabled={disableTwoFactorMutation.isPending || !verificationCode}>
                    {disableTwoFactorMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Disable 2FA'}
                  </button>
                </div>}
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>Add an extra layer of security to your account.</p>
                {!setupData && <button type="button" className="btn bp" style={{ marginTop: '10px' }} onClick={() => setupTwoFactorMutation.mutate()} disabled={setupTwoFactorMutation.isPending}>
                  {setupTwoFactorMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Enable 2FA'}
                </button>}
              </>
            )}
            {setupData && canManageTwoFactor && <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px' }}>Scan the QR code with your authenticator app.</p>
              <img src={setupData.qrCodeDataUrl} alt="Two-factor authentication setup QR code" style={{ width: '180px', height: '180px', background: 'white', padding: '8px', borderRadius: '8px' }} />
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '8px' }}>Manual setup key: <strong>{setupData.secret}</strong></p>
              <p style={{ fontSize: '11px', color: '#fbbf24', marginTop: '8px' }}>Save these recovery codes now. They are shown only during setup.</p>
              <code style={{ display: 'block', marginTop: '6px', fontSize: '11px', lineHeight: 1.7, wordBreak: 'break-word' }}>{setupData.recoveryCodes.join(' · ')}</code>
              <input className="inp" style={{ marginTop: '10px' }} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="Enter authenticator code" inputMode="numeric" />
              <button type="button" className="btn bp" style={{ marginTop: '8px' }} onClick={() => confirmTwoFactorMutation.mutate()} disabled={confirmTwoFactorMutation.isPending || !verificationCode}>
                {confirmTwoFactorMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm and enable'}
              </button>
            </div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--c3)', border: '1px solid var(--bd)' }}>
            <p style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 500 }}>Active Sessions</p>
            <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>Managed automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
}
