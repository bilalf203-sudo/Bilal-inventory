import { ExecutionContext, ForbiddenException, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest } from './current-user.decorator';

export const BRAND_REQUIRED_KEY = 'brand_required';

/**
 * Marks a route as NOT requiring an X-Brand-Id header (e.g. /auth/me, /brands).
 * Default for every route is "brand required". Add @NoBrand() to exempt.
 */
export const NoBrand = () => SetMetadata(BRAND_REQUIRED_KEY, false);

/**
 * Injects the validated brandId for the current request. Requires BrandGuard
 * to have run (which is the case for all routes except those marked @NoBrand).
 */
export const CurrentBrand = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest & { brandId?: string }>();
    if (!req.brandId) {
      throw new ForbiddenException(
        'No brand context — this route requires an X-Brand-Id header',
      );
    }
    return req.brandId;
  },
);
