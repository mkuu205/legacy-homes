'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, LayoutDashboard, ReceiptText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PaymentDetails {
  paymentId: string | null;
  trackingId: string | null;
  amount: string | null;
  isLoaded: boolean;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    paymentId: null,
    trackingId: null,
    amount: null,
    isLoaded: false,
  });

  useEffect(() => {
    const paymentId = searchParams.get('paymentId');
    const tracking = searchParams.get('tracking');
    const amount = searchParams.get('amount');

    setPaymentDetails({
      paymentId,
      trackingId: tracking,
      amount,
      isLoaded: true,
    });
  }, [searchParams]);

  if (!paymentDetails.isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--gl)] border-t-[var(--ac)] rounded-full animate-spin"></div>
          <p className="text-[var(--t2)] font-medium animate-pulse">Confirming payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-12 font-[var(--f2)]">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="card glassy relative overflow-hidden border-[var(--bd2)]">
          {/* Success Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[var(--ac)] opacity-10 blur-[100px] pointer-events-none"></div>

          {/* Header */}
          <div className="text-center relative z-10 pt-4 pb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--gl)] border border-[var(--ac)]/20 mb-6">
              <CheckCircle2 className="w-10 h-10 text-[var(--ac)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--t1)] font-[var(--f1)] mb-2 tracking-tight">
              Payment Received
            </h1>
            <p className="text-[var(--t2)] text-lg">
              Thank you! Your transaction was successful.
            </p>
          </div>

          {/* Details Section */}
          <div className="space-y-3 mb-8">
            <div className="flex flex-col gap-3">
              {/* Amount Display */}
              {paymentDetails.amount && (
                <div className="card-sm bg-[var(--sf)] border-[var(--bd)] flex items-center justify-between">
                  <span className="text-[var(--t3)] font-bold text-xs uppercase tracking-wider">Amount Paid</span>
                  <span className="text-2xl font-bold text-[var(--ac)] font-[var(--f1)]">{paymentDetails.amount}</span>
                </div>
              )}

              {/* Payment ID */}
              {paymentDetails.paymentId && (
                <div className="card-sm bg-[var(--sf)] border-[var(--bd)]">
                  <label className="block text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest mb-1">
                    Payment ID
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm text-[var(--t1)] font-mono truncate">{paymentDetails.paymentId}</code>
                  </div>
                </div>
              )}

              {/* Tracking ID */}
              {paymentDetails.trackingId && (
                <div className="card-sm bg-[var(--sf)] border-[var(--bd)]">
                  <label className="block text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest mb-1">
                    Tracking Reference
                  </label>
                  <code className="text-sm text-[var(--t1)] font-mono truncate">{paymentDetails.trackingId}</code>
                </div>
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="p-4 rounded-xl bg-[var(--gl)] border border-[var(--ac)]/10 mb-8">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <ReceiptText className="w-4 h-4 text-[var(--ac)]" />
              </div>
              <p className="text-xs text-[var(--t2)] leading-relaxed">
                A digital receipt has been generated and sent to your email. You can also download it from your dashboard.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard" className="btn bp py-3.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link href="/dashboard/bills" className="btn bg py-3.5">
              <ReceiptText className="w-4 h-4" />
              View Bills
            </Link>
          </div>
        </div>

        {/* Footer Support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--t3)]">
            Having trouble?{' '}
            <Link href="/support" className="text-[var(--ac)] hover:underline inline-flex items-center gap-1 font-medium">
              Contact Support <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-[var(--gl)] border-t-[var(--ac)] rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
