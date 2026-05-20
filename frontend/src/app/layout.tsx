import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Legacy Homes | Water Billing System',
  description: 'Modern estate water billing and resident self-service platform for Legacy Homes, Kenya',
  keywords: ['water billing', 'estate management', 'Kenya', 'M-Pesa', 'Legacy Homes'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
