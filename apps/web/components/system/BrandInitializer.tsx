'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { BrandContext as BrandContextPayload } from '@bilal/shared';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandStore } from '@/stores/brand.store';

export function BrandInitializer() {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const hasSession = useAuthStore((s) => s.hasSession);
  const meLoading = useAuthStore((s) => s.meLoading);
  const brandId = useBrandStore((s) => s.brandId);

  const isAuthenticated = !!user;
  const isLoading = hasSession === null || (hasSession === true && meLoading);
  const memberships = user?.memberships ?? [];

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const accessible = new Set(memberships.map((m) => m.brandId));

    if (brandId && !accessible.has(brandId) && !user.isPlatformAdmin) {
      useBrandStore.getState().setBrandId(null);
      return;
    }

    if (!brandId && memberships.length === 1) {
      useBrandStore.getState().setBrandId(memberships[0].brandId);
    }
  }, [isLoading, isAuthenticated, user, memberships, brandId]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const onPicker = pathname.startsWith('/select-brand');
    const onSettings = pathname.startsWith('/settings/brands');

    if (!brandId && !onPicker && !onSettings) {
      router.replace('/select-brand');
    } else if (brandId && onPicker) {
      router.replace('/warehouse');
    }
  }, [isLoading, isAuthenticated, brandId, pathname, router]);

  const contextQuery = useQuery({
    queryKey: ['auth', 'context', brandId],
    queryFn: () => apiGet<BrandContextPayload>('/auth/context'),
    enabled: !!brandId && isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    useBrandStore.getState().setContextLoading(contextQuery.isLoading);
  }, [contextQuery.isLoading]);

  useEffect(() => {
    useBrandStore.getState().setContext(contextQuery.data ?? null);
  }, [contextQuery.data]);

  return null;
}
