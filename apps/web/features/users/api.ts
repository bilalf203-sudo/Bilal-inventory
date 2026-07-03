'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';

interface UserRow {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  userRoles: { role: { id: string; name: string } }[];
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<UserRow[]>('/users'),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<RoleRow[]>('/roles'),
  });
}

export function useAssignRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      apiPost(`/users/${userId}/roles`, { roleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Roles updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiPatch(`/users/${userId}/active`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
