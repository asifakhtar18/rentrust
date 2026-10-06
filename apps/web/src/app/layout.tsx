import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: {
    default: 'RentTrust — Know the place before you rent it',
    template: '%s · RentTrust',
  },
  description:
    'Research a property, landlord, PG, co-living space, or locality before you rent. Resident Trust Scores, verified reviews, and locality intelligence.',
};

export const viewport: Viewport = {
  themeColor: '#0E1327',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
