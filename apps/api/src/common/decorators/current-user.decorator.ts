import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { BrandMembership } from '@bilal/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  isPlatformAdmin: boolean;
  memberships: BrandMembership[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new Error('CurrentUser decorator used on an unauthenticated route');
    }
    return req.user;
  },
);
