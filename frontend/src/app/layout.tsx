import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const viewport: Viewport = {
  themeColor: '#071a3a',
};

export const metadata: Metadata = {
  title: 'Legacy Homes | Water Billing System',
  description: 'Modern estate water billing and resident self-service platform for Legacy Homes, Kenya',
  keywords: ['water billing', 'estate management', 'Kenya', 'M-Pesa', 'Legacy Homes'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'Legacy Homes | Water Billing System',
    description: 'Modern estate water billing and resident self-service platform',
    images: [
      {
        url: '/brand/legacy-homes-logo.png',
        width: 1024,
        height: 1024,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#071a3a" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
