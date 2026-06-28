'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
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
    // Extract query parameters
    const reason = searchParams.get('reason');
    const tracking = searchParams.get('tracking');

    setFailureDetails({
      reason: reason || 'An error occurred during payment processing.',
      trackingId: tracking,
      isLoaded: true,
    });
  }, [searchParams]);

  if (!failureDetails.isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        {/* Failure Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-12 sm:px-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full opacity-20 animate-pulse"></div>
                <XCircle
                  className="h-20 w-20 text-white relative z-10"
                  aria-label="Payment failed"
                />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Payment Failed
            </h1>
            <p className="text-red-50 text-sm sm:text-base">
              We were unable to process your payment.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-8">
            {/* Failure Reason */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <label className="block text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">
                Reason
              </label>
              <p
                className="text-sm sm:text-base text-red-900 leading-relaxed"
                aria-label={`Payment failure reason: ${failureDetails.reason}`}
              >
                {failureDetails.reason}
              </p>
            </div>

            {/* Tracking ID */}
            {failureDetails.trackingId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Tracking ID
                </label>
                <p
                  className="text-xs sm:text-sm font-mono text-gray-900 break-all"
                  aria-label={`Tracking ID: ${failureDetails.trackingId}`}
                >
                  {failureDetails.trackingId}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Keep this ID for support reference.
                </p>
              </div>
            )}

            {/* Info Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <p className="text-xs sm:text-sm text-yellow-800">
                <span className="font-semibold">Tip:</span> Please check your payment details and try again. If the problem persists, contact our support team.
              </p>
            </div>

            {/* Troubleshooting Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">
                Troubleshooting
              </h3>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Verify your payment method details</li>
                <li>Check your account balance</li>
                <li>Ensure your internet connection is stable</li>
                <li>Try a different payment method</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
              <Link
                href="/dashboard/bills"
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Try Again - Go to Bills"
              >
                Try Again
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-white border-2 border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Go to Dashboard"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs sm:text-sm text-gray-600">
            Need help?{' '}
            <a
              href="mailto:support@legacyhomes.com"
              className="text-red-600 hover:text-red-700 font-semibold underline"
            >
              Contact Support
            </a>
          </p>
          <p className="text-xs text-gray-500">
            Reference ID: <span className="font-mono">{failureDetails.trackingId || 'N/A'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-48 mx-auto"></div>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}
