import { ROLES, type RoleName } from './roles.js';

/**
 * Single source of truth for all permission strings.
 * Backend uses these in @Permissions() guards.
 * Frontend uses these in <Can> components.
 * Seed script inserts these into the DB.
 *
 * All permissions are SCOPED TO A BRAND (resolved via X-Brand-Id header).
 * Platform-level capabilities (create brand, list all brands) live on
 * User.isPlatformAdmin and don't appear here.
 */
export const PERMISSIONS = {
  // Brand (the workspace itself)
  BRAND_READ: 'brand.read',
  BRAND_UPDATE: 'brand.update',
  BRAND_MEMBER_READ: 'brand_member.read',
  BRAND_MEMBER_INVITE: 'brand_member.invite',
  BRAND_MEMBER_REMOVE: 'brand_member.remove',
  BRAND_MEMBER_UPDATE_ROLE: 'brand_member.update_role',

  // Collections
  COLLECTION_READ: 'collection.read',
  COLLECTION_CREATE: 'collection.create',
  COLLECTION_UPDATE: 'collection.update',
  COLLECTION_DELETE: 'collection.delete',

  // Articles
  ARTICLE_READ: 'article.read',
  ARTICLE_CREATE: 'article.create',
  ARTICLE_UPDATE: 'article.update',
  ARTICLE_DELETE: 'article.delete',

  // Marketplaces
  MARKETPLACE_READ: 'marketplace.read',
  MARKETPLACE_CREATE: 'marketplace.create',
  MARKETPLACE_UPDATE: 'marketplace.update',
  MARKETPLACE_DELETE: 'marketplace.delete',
  MARKETPLACE_ASSIGN_ARTICLE: 'marketplace.assign_article',
  MARKETPLACE_SET_PRICE: 'marketplace.set_price',

  // Inventory
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ALLOCATE: 'inventory.allocate',
  INVENTORY_RETURN: 'inventory.return',
  INVENTORY_ADJUST: 'inventory.adjust',

  // Sales
  SALE_READ: 'sale.read',
  SALE_RECORD: 'sale.record',

  // System
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  AUDIT_LOG_READ: 'audit_log.read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LIST: Permission[] = Object.values(PERMISSIONS);

/**
 * Role-to-permission mapping used to seed the database.
 * Roles are per-brand (BrandMember.roleId).
 */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [ROLES.ADMIN]: PERMISSION_LIST,

  [ROLES.WAREHOUSE_MANAGER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.COLLECTION_READ,
    PERMISSIONS.COLLECTION_CREATE,
    PERMISSIONS.COLLECTION_UPDATE,
    PERMISSIONS.COLLECTION_DELETE,
    PERMISSIONS.ARTICLE_READ,
    PERMISSIONS.ARTICLE_CREATE,
    PERMISSIONS.ARTICLE_UPDATE,
    PERMISSIONS.ARTICLE_DELETE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ALLOCATE,
    PERMISSIONS.INVENTORY_RETURN,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.SALE_READ,
  ],

  [ROLES.MARKETPLACE_MANAGER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.COLLECTION_READ,
    PERMISSIONS.ARTICLE_READ,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.MARKETPLACE_ASSIGN_ARTICLE,
    PERMISSIONS.MARKETPLACE_SET_PRICE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.SALE_RECORD,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.COLLECTION_READ,
    PERMISSIONS.ARTICLE_READ,
    PERMISSIONS.MARKETPLACE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALE_READ,
  ],
};
