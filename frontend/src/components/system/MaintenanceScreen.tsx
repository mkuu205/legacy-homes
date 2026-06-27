'use client';

import { useState } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useAuthStore } from '@/store/auth.store';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export function MaintenanceScreen() {
  const { status, lastSuccessfulConnection, connectionAttempts, outageDuration, maintenanceMessage, isNotified, setNotified } = useSystemStatusStore();
  const { lastChecked, retry } = useBackendHealth();
  const { isAuthenticated, user } = useAuthStore();
  
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return format(new Date(timestamp), 'h:mm a');
  };

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notify-outage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, residentId: user?.id, name: user?.fullName }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to subscribe');
      }
      
      setNotified(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'Less than a minute';
    return `${minutes} Minute${minutes === 1 ? '' : 's'}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Legacy Homes</h1>
        <h2 className="text-xl text-gray-600 mb-4">Service Temporarily Unavailable</h2>
        
        <p className="text-gray-500 mb-6 text-sm">
          {maintenanceMessage || 'Our servers are currently unavailable. Your account and billing data remain safe.'}
        </p>

        <div className="border-t border-b border-gray-100 py-4 my-6 text-left space-y-3 text-sm">
          <h3 className="font-semibold text-gray-700 mb-2">System Status</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Backend API</span>
            <span className={`font-medium ${status === 'MAINTENANCE' ? 'text-amber-500' : 'text-red-500'}`}>
              {status === 'MAINTENANCE' ? 'Maintenance' : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Internet</span>
            <span className="font-medium text-green-500">
              {typeof navigator !== 'undefined' && navigator.onLine ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Last Successful Connection</span>
            <span className="font-medium text-gray-700">{formatTime(lastSuccessfulConnection)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Last Checked</span>
            <span className="font-medium text-gray-700">{formatTime(lastChecked)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Outage Duration</span>
            <span className="font-medium text-gray-700">{formatDuration(outageDuration)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Connection Attempts</span>
            <span className="font-medium text-gray-700">{connectionAttempts}</span>
          </div>
        </div>

        {!isNotified ? (
          <form onSubmit={handleNotifyMe} className="mb-6 space-y-3">
            {isAuthenticated ? (
              <p className="text-sm text-gray-600 mb-2">Notify me when service returns?</p>
            ) : (
              <div className="text-left">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            )}
            {error && <p className="text-red-500 text-xs text-left">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Subscribing...' : 'Notify Me'}
            </Button>
          </form>
        ) : (
          <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
            We'll notify {email} when service returns.
          </div>
        )}

        <div className="space-y-4">
          <Button variant="outline" onClick={retry} className="w-full text-gray-700">
            Retry Connection
          </Button>
          <div className="text-xs text-gray-400">
            Checking again automatically...
          </div>
        </div>
      </div>
    </div>
  );
}
