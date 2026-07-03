'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CurrentUser } from '@bilal/shared';
import { getSupabaseBrowser } from '@/lib/supabase';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export function AuthInitializer() {
  const supabase = useMemo(() => (BYPASS_AUTH ? null : getSupabaseBrowser()), []);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const hasSession = useAuthStore((s) => s.hasSession);

  useEffect(() => {
    if (BYPASS_AUTH || !supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) useAuthStore.getState().setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setHasSession(!!session);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<CurrentUser>('/auth/me'),
    enabled: hasSession === true,
    staleTime: 60_000,
  });

  useEffect(() => {
    useAuthStore.getState().setMeLoading(meQuery.isLoading);
  }, [meQuery.isLoading]);

  useEffect(() => {
    useAuthStore.getState().setUser(meQuery.data ?? null);
  }, [meQuery.data]);

  useEffect(() => {
    if (BYPASS_AUTH) return;
    if (hasSession === false && pathname !== '/login') {
      router.replace('/login');
    } else if (hasSession === true && pathname === '/login') {
      router.replace('/');
    }
  }, [hasSession, pathname, router]);

  return null;
}
