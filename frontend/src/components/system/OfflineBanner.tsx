'use client';

export function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50 shadow-md flex items-center justify-center space-x-2">
      <div className="animate-pulse w-2 h-2 bg-white rounded-full"></div>
      <p className="text-sm font-medium">Connection lost. Attempting reconnect...</p>
    </div>
  );
}
