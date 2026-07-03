import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  BRAND_REQUIRED_KEY,
} from '../../../common/decorators/current-brand.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface BrandRequest extends AuthenticatedRequest {
  brandId?: string;
  brandRoleId?: string;
  brandPermissions?: string[];
}

/**
 * Resolves the brand context for the current request:
 *
 *   1. Reads X-Brand-Id header
 *   2. Validates the user is a member of that brand (or is platform admin)
 *   3. Attaches `brandId`, `brandRoleId`, and `brandPermissions` to req
 *
 * Skipped for:
 *   - @Public() routes (no auth at all)
 *   - @NoBrand() routes (e.g. /auth/me, /brands list)
 *
 * Runs AFTER JwtAuthGuard (req.user is already populated).
 */
@Injectable()
export class BrandGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const brandRequired = this.reflector.getAllAndOverride<boolean>(BRAND_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Default = brand required. Only skip when explicitly @NoBrand().
    if (brandRequired === false) return true;

    const req = context.switchToHttp().getRequest<BrandRequest>();
    if (!req.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const headerValue = req.headers['x-brand-id'];
    const brandId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!brandId) {
      throw new ForbiddenException('Missing X-Brand-Id header');
    }

    // Platform admins can act on any brand
    if (req.user.isPlatformAdmin) {
      const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand || !brand.isActive) throw new ForbiddenException('Brand not found or inactive');
      req.brandId = brand.id;
      // Grant all permissions implicitly via the admin role
      req.brandPermissions = await this.allPermissionStrings();
      return true;
    }

    const member = await this.prisma.brandMember.findUnique({
      where: { brandId_userId: { brandId, userId: req.user.id } },
      include: {
        brand: true,
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this brand');
    }
    if (!member.brand.isActive) {
      throw new ForbiddenException('Brand is inactive');
    }

    req.brandId = brandId;
    req.brandRoleId = member.roleId;
    req.brandPermissions = member.role.rolePermissions.map((rp) => rp.permission.name);
    return true;
  }

  private allPermissionsCache: string[] | null = null;
  private async allPermissionStrings(): Promise<string[]> {
    if (this.allPermissionsCache) return this.allPermissionsCache;
    const all = await this.prisma.permission.findMany({ select: { name: true } });
    this.allPermissionsCache = all.map((p) => p.name);
    return this.allPermissionsCache;
  }
}
