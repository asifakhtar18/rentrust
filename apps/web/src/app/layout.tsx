import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/navigation/navbar';
import { Footer } from '@/components/navigation/footer';

/*
 * Apple design system: the primary typeface is the system font (SF Pro on
 * Apple devices) applied via the CSS font stack in globals.css — no webfont to
 * load. Geist Mono is kept only for tabular numeric data.
 */

export const metadata: Metadata = {
  title: { default: 'RentTrust — Know the place before you rent', template: '%s · RentTrust' },
  description:
    'Real resident experiences, property intelligence and transparent trust scores — so you know what you are signing up for before you move in.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
