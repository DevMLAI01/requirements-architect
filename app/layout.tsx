import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import 'highlight.js/styles/github-dark.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'REQUIREMENTS Architect',
  description:
    'Generate production-grade REQUIREMENTS.md files for AI/ML projects — powered by Claude.',
  metadataBase: new URL('https://requirements-architect.vercel.app'),
  openGraph: {
    title: 'REQUIREMENTS Architect',
    description:
      'Generate production-grade REQUIREMENTS.md files for AI/ML projects — powered by Claude.',
    url: 'https://requirements-architect.vercel.app',
    siteName: 'REQUIREMENTS Architect',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'REQUIREMENTS Architect',
    description:
      'Generate production-grade REQUIREMENTS.md files for AI/ML projects — powered by Claude.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 font-sans">{children}</body>
    </html>
  );
}
