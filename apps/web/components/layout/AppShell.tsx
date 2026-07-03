'use client';

import { Loader2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useAuth, useBrand } from '@/stores';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useAuth();
  const { brandId, contextLoading } = useBrand();

  if (isLoading || (isAuthenticated && brandId && contextLoading)) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // BrandProvider takes care of redirecting to /select-brand when no brand is chosen.
  if (!isAuthenticated || !brandId) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
