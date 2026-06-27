import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Legacy Homes | Water Billing System',
  description: 'Modern estate water billing and resident self-service platform for Legacy Homes, Kenya',
  keywords: ['water billing', 'estate management', 'Kenya', 'M-Pesa', 'Legacy Homes'],
  icons: {
    icon: 'https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png',
    apple: 'https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png',
  },
  openGraph: {
    title: 'Legacy Homes | Water Billing System',
    description: 'Modern estate water billing and resident self-service platform',
    images: [
      {
        url: 'https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png" />
        <link rel="apple-touch-icon" href="https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
