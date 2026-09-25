import { Anton, Geist, Geist_Mono } from 'next/font/google';
import { BRAND } from '@/lib/brand';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './tokens.css';
import './globals.css';
import './glass.css';
import './tool.css';
import './prompts.css';
import './hero.css';
import './theme.css';
import './polish.css';
import './system.css';

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Geist({ subsets: ['latin'], variable: '--font-body' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.author, url: BRAND.repo }],
  icons: { icon: '/icon.svg', apple: BRAND.avatar.src },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    locale: 'es_ES',
    images: [{ url: BRAND.avatar.src, width: BRAND.avatar.width, height: BRAND.avatar.height, alt: BRAND.name }],
  },
  twitter: { card: 'summary', title: BRAND.name, description: BRAND.description, images: [BRAND.avatar.src] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: BRAND.colors.dark.background },
    { media: '(prefers-color-scheme: light)', color: BRAND.colors.light.background },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang={BRAND.locale} className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
