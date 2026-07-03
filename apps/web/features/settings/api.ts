'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api-client';

interface Settings {
  lowStockThreshold: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiGet<Settings>('/settings'),
  });
}

export function useUpdateLowStockThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) =>
      apiPatch('/settings/low-stock-threshold', { lowStockThreshold: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Threshold updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
