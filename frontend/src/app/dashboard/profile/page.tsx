'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/components/ui/toaster';
import { User, Camera, Loader2, Eye, EyeOff, Shield, Home, Phone, Mail, Hash, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    houseNumber: user?.houseNumber || '',
  });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const res = await api.put('/residents/profile', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      updateUser(data);
      toast({ type: 'success', title: 'Profile updated successfully!' });
    },
    onError: (error) => toast({ type: 'error', title: 'Update failed', description: getErrorMessage(error) }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      await api.put('/residents/change-password', data);
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => toast({ type: 'error', title: 'Password change failed', description: getErrorMessage(error) }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/auth/delete-account', { data: { password } });
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Account deleted', description: 'Your account has been permanently deleted.' });
      logout();
      router.push('/login');
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to delete account', description: getErrorMessage(error) }),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ type: 'error', title: 'Invalid file', description: 'Please select an image file' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: 'error', title: 'File too large', description: 'Maximum file size is 5MB' });
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const res = await api.post('/residents/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profilePicture: res.data.data.profilePicture });
      toast({ type: 'success', title: 'Profile photo updated!' });
    } catch (error) {
      toast({ type: 'error', title: 'Upload failed', description: getErrorMessage(error) });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ type: 'error', title: 'Passwords do not match' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({ type: 'error', title: 'Password too short', description: 'Minimum 8 characters' });
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">My Profile</h1>
        <p className="pg-sh">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--gl)', border: '2px solid rgba(0, 198, 167, 0.25)', fontSize: '32px', fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--f1)' }}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.fullName?.charAt(0).toUpperCase()
              )}
            </div>
            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <button onClick={() => document.getElementById('photo-upload')?.click()} disabled={isUploadingPhoto} style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--c1)', background: 'var(--ac)', cursor: isUploadingPhoto ? 'not-allowed' : 'pointer', opacity: isUploadingPhoto ? 0.7 : 1 }}>
              {isUploadingPhoto ? <Loader2 size={14} style={{ color: 'white', animation: 'spin 1s linear infinite' }} /> : <Camera size={14} style={{ color: 'white' }} />}
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px', fontFamily: 'var(--f1)' }}>{user?.fullName}</h2>
            <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '8px' }}>{user?.email}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="badge b-ac" style={{ fontSize: '10px' }}>Resident</div>
              <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#34d399', fontSize: '10px' }}>{user?.accountStatus}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
          {[
            { icon: Hash, label: 'Account Number', value: user?.accountNumber },
            { icon: Home, label: 'House Number', value: user?.houseNumber || 'Not set' },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Phone, label: 'Phone', value: user?.phone },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c2)', border: '1px solid var(--bd)', flexShrink: 0 }}>
                <Icon size={14} style={{ color: 'var(--t2)' }} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginTop: '2px' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'profile', label: 'Edit Profile', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)} className={`tab ${activeTab === id ? 'on' : ''}`}>
            <Icon size={14} style={{ marginRight: '4px' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Edit Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Personal Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="fg">
              <label className="lbl">Full Name</label>
              <input value={profileData.fullName} onChange={e => setProfileData(d => ({ ...d, fullName: e.target.value }))} className="inp" />
            </div>
            <div className="fg">
              <label className="lbl">Phone Number</label>
              <input value={profileData.phone} onChange={e => setProfileData(d => ({ ...d, phone: e.target.value }))} className="inp" />
            </div>
            <div className="fg">
              <label className="lbl">House Number</label>
              <input value={profileData.houseNumber} onChange={e => setProfileData(d => ({ ...d, houseNumber: e.target.value }))} className="inp" />
            </div>
            <button onClick={() => updateProfileMutation.mutate(profileData)} disabled={updateProfileMutation.isPending} className="btn bp">
              {updateProfileMutation.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="fg">
                <label className="lbl">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showOld ? 'text' : 'password'} value={passwordData.currentPassword} onChange={e => setPasswordData(d => ({ ...d, currentPassword: e.target.value }))} className="inp" style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowOld(!showOld)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showNew ? 'text' : 'password'} value={passwordData.newPassword} onChange={e => setPasswordData(d => ({ ...d, newPassword: e.target.value }))} className="inp" style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {passwordData.newPassword && (() => {
                  const pw = passwordData.newPassword;
                  let score = 0;
                  if (pw.length >= 8) score++;
                  if (pw.length >= 12) score++;
                  if (/[A-Z]/.test(pw)) score++;
                  if (/[0-9]/.test(pw)) score++;
                  if (/[^A-Za-z0-9]/.test(pw)) score++;
                  const levels = [
                    { label: 'Very Weak', color: '#ef4444' },
                    { label: 'Weak', color: '#f97316' },
                    { label: 'Fair', color: '#eab308' },
                    { label: 'Good', color: '#22c55e' },
                    { label: 'Strong', color: '#10b981' },
                  ];
                  const level = levels[Math.min(score, 4)];
                  return (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {levels.map((l, i) => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= score - 1 ? level.color : 'var(--bd)', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: level.color, fontWeight: 600 }}>{level.label}</p>
                    </div>
                  );
                })()}
              </div>
              <div className="fg">
                <label className="lbl">Confirm New Password</label>
                <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))} className="inp" />
              </div>
              <button onClick={handlePasswordChange} disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword} className="btn bp">
                {changePasswordMutation.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Change Password
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>Danger Zone</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '16px', lineHeight: '1.6' }}>
              Permanently delete your account and all associated data. This action cannot be undone. All your bills, payments, and notifications will be removed.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Trash2 size={14} />
              Delete My Account
            </button>
          </div>
        </>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Delete Account</h3>
                <p style={{ fontSize: '12px', color: 'var(--t2)' }}>This action is permanent and cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px', lineHeight: '1.6', padding: '12px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              You are about to permanently delete your account <strong style={{ color: 'var(--t1)' }}>{user?.email}</strong>. All your data including bills, payments, and notifications will be permanently removed.
            </p>
            <div className="fg" style={{ marginBottom: '16px' }}>
              <label className="lbl">Enter your password to confirm</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  className="inp"
                  placeholder="Your current password"
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center' }}>
                  {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => deleteAccountMutation.mutate(deletePassword)}
                disabled={!deletePassword || deleteAccountMutation.isPending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: !deletePassword || deleteAccountMutation.isPending ? 'not-allowed' : 'pointer', opacity: !deletePassword || deleteAccountMutation.isPending ? 0.6 : 1 }}
              >
                {deleteAccountMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
