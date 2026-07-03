import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrandMembership, RoleName } from '@bilal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import type { Env } from '../../config/env.validation';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly driver: 'supabase' | 'dev';
  private readonly devUserEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    config: ConfigService<Env, true>,
  ) {
    this.driver = config.get('AUTH_DRIVER', { infer: true }) ?? 'supabase';
    this.devUserEmail = config.get('DEV_USER_EMAIL', { infer: true }) ?? 'admin@dev.local';
    if (this.driver === 'dev') {
      this.logger.warn(
        `AUTH_DRIVER=dev — bypassing JWT verification, all requests authenticate as ${this.devUserEmail}`,
      );
    }
  }

  async authenticate(token: string | null): Promise<AuthenticatedUser> {
    if (this.driver === 'dev') {
      return this.hydrateByEmail(this.devUserEmail);
    }
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload;
    try {
      payload = await this.supabase.verifyJwt(token);
    } catch (err) {
      this.logger.debug(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
    return this.hydrateById(payload.sub);
  }

  private async hydrateByEmail(email: string): Promise<AuthenticatedUser> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    if (!u) {
      throw new UnauthorizedException(
        `Dev user "${email}" not found. Run: pnpm --filter @bilal/api db:dev-superuser`,
      );
    }
    return this.hydrateById(u.id);
  }

  private async hydrateById(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        brandMemberships: {
          include: { brand: true, role: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found in application database');
    if (!user.isActive) throw new UnauthorizedException('User account is disabled');

    const memberships: BrandMembership[] = user.brandMemberships
      .filter((m) => m.brand.isActive)
      .map((m) => ({
        brandId: m.brandId,
        brand: {
          id: m.brand.id,
          name: m.brand.name,
          slug: m.brand.slug,
          description: m.brand.description,
          logoUrl: m.brand.logoUrl,
          isActive: m.brand.isActive,
          createdAt: m.brand.createdAt.toISOString(),
          updatedAt: m.brand.updatedAt.toISOString(),
        },
        role: m.role.name as RoleName,
      }));

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isPlatformAdmin: user.isPlatformAdmin,
      memberships,
    };
  }
}
