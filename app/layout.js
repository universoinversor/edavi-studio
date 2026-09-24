import { Anton, Geist, Geist_Mono } from 'next/font/google';
import { BRAND } from '@/lib/brand';
import './globals.css';

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Geist({ subsets: ['latin'], variable: '--font-body' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: BRAND.name,
  description: BRAND.description,
  icons: { icon: '/icon.svg' },
};

export const viewport = { themeColor: '#0b0a0f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
