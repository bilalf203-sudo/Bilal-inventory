export const ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  MARKETPLACE_MANAGER: 'marketplace_manager',
  VIEWER: 'viewer',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LIST: RoleName[] = Object.values(ROLES);

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  admin: 'Full access to all features and settings',
  warehouse_manager: 'Manage collections, articles, and warehouse inventory',
  marketplace_manager: 'Assign articles to marketplaces and record sales',
  viewer: 'Read-only access to dashboards and reports',
};
