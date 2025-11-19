import type { Metadata } from 'next';
import './globals.css';
import AuthInitializer from './components/AuthInitializer';

export const metadata: Metadata = {
  title: 'Atlantic Hotel & Suites - Receipt System',
  description: 'Receipt management system for Atlantic Hotel & Suites',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}