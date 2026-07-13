'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import type { CurrentUser } from '@bilal/shared';
import { getSupabaseBrowser } from '@/lib/supabase';
import { queryPersister } from '@/lib/query-persister';

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

interface AuthState {
  user: CurrentUser | null;
  hasSession: boolean | null;
  meLoading: boolean;
}

interface AuthStoreActions {
  setUser: (user: CurrentUser | null) => void;
  setHasSession: (hasSession: boolean | null) => void;
  setMeLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState & AuthStoreActions>((set) => ({
  user: null,
  hasSession: BYPASS_AUTH ? true : null,
  meLoading: false,
  setUser: (user) => set({ user }),
  setHasSession: (hasSession) => set({ hasSession }),
  setMeLoading: (meLoading) => set({ meLoading }),
  reset: () => set({ user: null, hasSession: BYPASS_AUTH ? true : null, meLoading: false }),
}));

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const hasSession = useAuthStore((s) => s.hasSession);
  const meLoading = useAuthStore((s) => s.meLoading);
  return {
    user,
    isAuthenticated: !!user,
    isLoading: hasSession === null || (hasSession === true && meLoading),
  };
}

export function useAuthActions() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    if (!BYPASS_AUTH) {
      await getSupabaseBrowser().auth.signOut();
    }
    queryClient.clear();
    // Drop the persisted cache too, so the next user starts from a clean slate.
    void queryPersister.removeClient();
    useAuthStore.getState().reset();
    router.replace('/login');
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  return { signOut, refresh };
}
