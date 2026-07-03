import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@bilal/shared';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator';

interface BrandScopedRequest extends AuthenticatedRequest {
  brandId?: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<BrandScopedRequest>();
    if (!req.user) throw new ForbiddenException('Not authenticated');
    if (req.user.isPlatformAdmin) return true;

    const role = req.user.memberships.find((m) => m.brandId === req.brandId)?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(`Requires one of role(s): ${required.join(', ')}`);
    }
    return true;
  }
}
