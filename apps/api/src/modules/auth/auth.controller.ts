import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { BrandContext, Permission, RoleName } from '@bilal/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import {
  CurrentBrand,
  NoBrand,
} from '../../common/decorators/current-brand.decorator';

interface BrandScopedRequest extends Request {
  brandRoleId?: string;
  brandPermissions?: string[];
}

@Controller('auth')
export class AuthController {
  /**
   * Identity payload — works without a brand selection. Used right after login
   * to drive the brand picker.
   */
  @Get('me')
  @NoBrand()
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  /**
   * Per-brand permissions for the current X-Brand-Id. Frontend caches this and
   * gates UI via <Can>.
   */
  @Get('context')
  context(
    @CurrentBrand() brandId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: BrandScopedRequest,
  ): BrandContext {
    const membership = user.memberships.find((m) => m.brandId === brandId);
    const role: RoleName = user.isPlatformAdmin && !membership ? 'admin' : (membership?.role ?? 'viewer');
    return {
      brandId,
      role,
      permissions: (req.brandPermissions ?? []) as Permission[],
    };
  }
}
