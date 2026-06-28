'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, RefreshCw, LayoutDashboard, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface FailureDetails {
  reason: string | null;
  trackingId: string | null;
  isLoaded: boolean;
}

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const [failureDetails, setFailureDetails] = useState<FailureDetails>({
    reason: null,
    trackingId: null,
    isLoaded: false,
  });

  useEffect(() => {
    const reason = searchParams.get('reason');
    const tracking = searchParams.get('tracking');

    setFailureDetails({
      reason: reason || 'Your transaction could not be completed at this time.',
      trackingId: tracking,
      isLoaded: true,
    });
  }, [searchParams]);

  if (!failureDetails.isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500/10 border-t-red-500 rounded-full animate-spin"></div>
          <p className="text-[var(--t2)] font-medium animate-pulse">Processing status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-12 font-[var(--f2)]">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="card glassy relative overflow-hidden border-red-500/20">
          {/* Error Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500 opacity-5 blur-[100px] pointer-events-none"></div>

          {/* Header */}
          <div className="text-center relative z-10 pt-4 pb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--t1)] font-[var(--f1)] mb-2 tracking-tight">
              Payment Failed
            </h1>
            <p className="text-[var(--t2)] text-lg">
              We couldn&apos;t process your payment.
            </p>
          </div>

          {/* Error Reason */}
          <div className="mb-8">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <label className="block text-[10px] font-bold text-red-500/60 uppercase tracking-widest mb-2">
                Declined Reason
              </label>
              <p className="text-[var(--t1)] text-sm leading-relaxed">
                {failureDetails.reason}
              </p>
            </div>
          </div>

          {/* Tracking ID */}
          {failureDetails.trackingId && (
            <div className="mb-8">
              <div className="card-sm bg-[var(--sf)] border-[var(--bd)]">
                <label className="block text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest mb-1">
                  Reference ID
                </label>
                <code className="text-sm text-[var(--t2)] font-mono break-all">
                  {failureDetails.trackingId}
                </code>
              </div>
            </div>
          )}

          {/* Troubleshooting Tips */}
          <div className="p-4 rounded-xl bg-[var(--c2)] border border-[var(--bd)] mb-8">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <AlertCircle className="w-4 h-4 text-[var(--wa)]" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--t2)] uppercase tracking-wider">Quick Troubleshooting</p>
                <ul className="text-xs text-[var(--t3)] space-y-1 list-disc list-inside">
                  <li>Check your card balance or limit</li>
                  <li>Verify card details and CVV</li>
                  <li>Ensure 3D Secure is enabled</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard/bills" className="btn bp py-3.5">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>
            <Link href="/dashboard" className="btn bg py-3.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Footer Support */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-[var(--t3)]">
            Need assistance?{' '}
            <Link href="/support" className="text-[var(--ac)] hover:underline inline-flex items-center gap-1 font-medium">
              Contact Billing Support <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
          <div className="pt-4 border-t border-[var(--bd)]">
            <p className="text-[10px] text-[var(--t3)] uppercase tracking-[0.2em]">
              Reference Code: {failureDetails.trackingId || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}
