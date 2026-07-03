import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '@bilal/shared';

export const ROLES_KEY = 'roles';

/**
 * Requires the user to have at least ONE of the listed roles.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
