'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
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
    // Extract query parameters
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-12 sm:px-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
                <CheckCircle2
                  className="h-20 w-20 text-white relative z-10"
                  aria-label="Payment successful"
                />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-green-50 text-sm sm:text-base">
              Your payment has been processed successfully.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-8">
            {/* Payment Details */}
            <div className="space-y-4 mb-8">
              {/* Payment ID */}
              {paymentDetails.paymentId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Payment ID
                  </label>
                  <p
                    className="text-sm sm:text-base font-mono text-gray-900 break-all"
                    aria-label={`Payment ID: ${paymentDetails.paymentId}`}
                  >
                    {paymentDetails.paymentId}
                  </p>
                </div>
              )}

              {/* Tracking ID */}
              {paymentDetails.trackingId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Tracking ID
                  </label>
                  <p
                    className="text-sm sm:text-base font-mono text-gray-900 break-all"
                    aria-label={`Tracking ID: ${paymentDetails.trackingId}`}
                  >
                    {paymentDetails.trackingId}
                  </p>
                </div>
              )}

              {/* Amount */}
              {paymentDetails.amount && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Amount Paid
                  </label>
                  <p
                    className="text-lg sm:text-xl font-bold text-green-600"
                    aria-label={`Amount: ${paymentDetails.amount}`}
                  >
                    {paymentDetails.amount}
                  </p>
                </div>
              )}
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-xs sm:text-sm text-blue-800">
                <span className="font-semibold">Note:</span> A confirmation email has been sent to your registered email address. Please keep your payment ID for future reference.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Go to Dashboard"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/dashboard/bills"
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-white border-2 border-green-500 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="View Bills"
              >
                View Bills
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-xs sm:text-sm text-gray-600">
            Questions?{' '}
            <a
              href="mailto:support@legacyhomes.com"
              className="text-green-600 hover:text-green-700 font-semibold underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-48 mx-auto"></div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
