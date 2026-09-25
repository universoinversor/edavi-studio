import { Anton, Geist, Geist_Mono } from 'next/font/google';
import { BRAND } from '@/lib/brand';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './globals.css';
import './glass.css';
import './tool.css';
import './prompts.css';
import './hero.css';
import './theme.css';

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
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
