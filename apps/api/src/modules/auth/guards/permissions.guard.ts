import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@bilal/shared';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator';

interface PermsRequest extends AuthenticatedRequest {
  brandPermissions?: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<PermsRequest>();
    if (!req.user) throw new ForbiddenException('Not authenticated');

    // Platform admin: implicit all permissions
    if (req.user.isPlatformAdmin) return true;

    if (!req.brandPermissions) {
      throw new ForbiddenException(
        'Permission check requires a brand context (X-Brand-Id header)',
      );
    }

    const granted = new Set(req.brandPermissions);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required permission(s): ${missing.join(', ')}`);
    }
    return true;
  }
}
