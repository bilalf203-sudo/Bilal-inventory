import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { AuthInitializer } from '@/components/system/AuthInitializer';
import { BrandInitializer } from '@/components/system/BrandInitializer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bilal Inventory',
  description: 'Warehouse and multi-marketplace inventory management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <AuthInitializer />
          <BrandInitializer />
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
