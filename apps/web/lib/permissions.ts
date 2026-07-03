import type { BrandContext, Permission } from '@bilal/shared';

export function hasPermission(ctx: BrandContext | null, perm: Permission): boolean {
  if (!ctx) return false;
  return ctx.permissions.includes(perm);
}

export function hasAllPermissions(ctx: BrandContext | null, perms: Permission[]): boolean {
  if (!ctx) return false;
  return perms.every((p) => ctx.permissions.includes(p));
}

export function hasAnyPermission(ctx: BrandContext | null, perms: Permission[]): boolean {
  if (!ctx) return false;
  return perms.some((p) => ctx.permissions.includes(p));
}
