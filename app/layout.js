import { IBM_Plex_Mono, Instrument_Serif, Onest } from 'next/font/google';
import { BRAND } from '@/lib/brand';
import './globals.css';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const body = Onest({ subsets: ['latin'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata = {
  title: BRAND.name,
  description: BRAND.description,
  icons: { icon: '/icon.svg' },
};

export const viewport = { themeColor: '#0c0a09', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
