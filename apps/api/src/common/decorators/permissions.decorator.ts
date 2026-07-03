import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@bilal/shared';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requires the user to have ALL the listed permissions.
 *
 * @example
 *   @Permissions('article.create')
 *   @Post()
 *   create(...) { ... }
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
