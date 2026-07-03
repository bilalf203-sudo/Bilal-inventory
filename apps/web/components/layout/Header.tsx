'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useAuthActions, useBrand } from '@/stores';

export function Header() {
  const { user } = useAuth();
  const { signOut } = useAuthActions();
  const { context } = useBrand();
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b px-6">
      <div className="text-right">
        <div className="text-sm font-medium">{user?.fullName ?? user?.email}</div>
        <div className="text-xs text-muted-foreground">
          {context?.role ?? (user?.isPlatformAdmin ? 'platform admin' : 'guest')}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
