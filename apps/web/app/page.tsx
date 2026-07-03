'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth, useBrand, useBrandActions } from '@/stores';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { brandId, memberships } = useBrand();
  const { setBrandId } = useBrandActions();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (brandId) {
      router.replace('/warehouse');
    } else if (memberships.length === 1) {
      // Only one brand — skip the picker and open it directly.
      setBrandId(memberships[0].brandId);
      router.replace('/warehouse');
    } else {
      router.replace('/select-brand');
    }
  }, [isLoading, isAuthenticated, brandId, memberships, setBrandId, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
