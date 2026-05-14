import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Perfect Saturday Planner',
  description: 'An AI-powered agent that builds your ideal Saturday — personalised to your mood, budget, city, and interests.',
  openGraph: {
    title: 'Perfect Saturday Planner',
    description: 'Tell us your mood, budget and city. Get a curated Saturday plan in seconds.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen grain-overlay">
        {children}
      </body>
    </html>
  );
}
