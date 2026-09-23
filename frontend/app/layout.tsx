import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Playfair_Display } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Restaurant Hub',
  description:
    'Restaurant management app with live online cooking classes powered by RealtimeKit',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={playfair.variable}>
      <body>{children}</body>
    </html>
  );
}
