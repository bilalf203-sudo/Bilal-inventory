'use client';

import type { Permission } from '@bilal/shared';
import { useBrand } from '@/stores';
import { hasAllPermissions, hasAnyPermission } from '@/lib/permissions';
import type { PropsWithChildren, ReactNode } from 'react';

interface CanProps extends PropsWithChildren {
  permission?: Permission;
  permissions?: Permission[];
  mode?: 'all' | 'any';
  fallback?: ReactNode;
}

/**
 * Conditionally renders children if the current brand context grants the required permission(s).
 *
 * @example
 *   <Can permission="article.create">
 *     <Button>New Article</Button>
 *   </Can>
 */
export function Can({ permission, permissions, mode = 'all', fallback = null, children }: CanProps) {
  const { context } = useBrand();
  const perms = permission ? [permission] : (permissions ?? []);
  if (perms.length === 0) return <>{children}</>;
  const ok = mode === 'all' ? hasAllPermissions(context, perms) : hasAnyPermission(context, perms);
  return ok ? <>{children}</> : <>{fallback}</>;
}
