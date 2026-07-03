'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Brand,
  CreateBrandInput,
  InviteBrandMemberInput,
  UpdateBrandInput,
  UpdateBrandMemberRoleInput,
} from '@bilal/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

const KEYS = {
  all: ['brands'] as const,
  list: ['brands', 'list'] as const,
  current: ['brands', 'current'] as const,
  members: ['brands', 'current', 'members'] as const,
};

export interface BrandMemberRow {
  brandId: string;
  userId: string;
  roleId: string;
  joinedAt: string;
  user: { id: string; email: string; fullName: string | null; isActive: boolean };
  role: { id: string; name: string };
}

export function useMyBrands() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: () => apiGet<Brand[]>('/brands'),
  });
}

export function useCurrentBrand(enabled = true) {
  return useQuery({
    queryKey: KEYS.current,
    queryFn: () => apiGet<Brand>('/brands/current'),
    enabled,
  });
}

export function useBrandMembers(enabled = true) {
  return useQuery({
    queryKey: KEYS.members,
    queryFn: () => apiGet<BrandMemberRow[]>('/brands/current/members'),
    enabled,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBrandInput) => apiPost<Brand>('/brands', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Brand created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCurrentBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandInput) => apiPatch<Brand>('/brands/current', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Brand updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Brand>(`/brands/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Brand deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteBrandMemberInput) => apiPost('/brands/current/members', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members });
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...input }: UpdateBrandMemberRoleInput & { userId: string }) =>
      apiPatch(`/brands/current/members/${userId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members });
      toast.success('Role updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiDelete(`/brands/current/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
