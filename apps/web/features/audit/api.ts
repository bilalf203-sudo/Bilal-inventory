'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { email: string; fullName: string | null } | null;
}

export function useAuditLog(entity?: string) {
  return useQuery({
    queryKey: ['audit-log', entity ?? null],
    queryFn: () => apiGet<AuditLogRow[]>('/audit-log', { entity }),
  });
}
