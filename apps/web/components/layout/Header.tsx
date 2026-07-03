'use client';

import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useAuthActions, useBrand, useUIStore } from '@/stores';

export function Header() {
  const { user } = useAuth();
  const { signOut } = useAuthActions();
  const { context } = useBrand();
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);

  return (
    <header className="flex h-16 items-center gap-2 border-b px-4 sm:gap-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={toggleMobileSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-medium">{user?.fullName ?? user?.email}</div>
          <div className="truncate text-xs text-muted-foreground">
            {context?.role ?? (user?.isPlatformAdmin ? 'platform admin' : 'guest')}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={signOut} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
