import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateBrandInput,
  InviteBrandMemberInput,
  UpdateBrandInput,
} from '@bilal/shared';
import { ROLES } from '@bilal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Brands the user can see — either their memberships or all (if platform admin). */
  async listForUser(userId: string, isPlatformAdmin: boolean) {
    if (isPlatformAdmin) {
      return this.prisma.brand.findMany({ orderBy: { createdAt: 'asc' } });
    }
    const rows = await this.prisma.brandMember.findMany({
      where: { userId },
      include: { brand: true },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.filter((r) => r.brand.isActive).map((r) => r.brand);
  }

  async getById(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async getBySlug(slug: string) {
    return this.prisma.brand.findUnique({ where: { slug } });
  }

  /**
   * Create a brand and atomically make the creator the admin of it.
   * Used by platform admins. The creator becomes the first member with admin role.
   */
  async create(dto: CreateBrandInput, creatorId: string) {
    const existing = await this.prisma.brand.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Brand slug "${dto.slug}" already in use`);

    return this.prisma.$transaction(async (tx) => {
      const adminRole = await tx.role.findUniqueOrThrow({ where: { name: ROLES.ADMIN } });
      const brand = await tx.brand.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          logoUrl: dto.logoUrl ?? null,
          createdBy: creatorId,
        },
      });
      await tx.brandMember.create({
        data: {
          brandId: brand.id,
          userId: creatorId,
          roleId: adminRole.id,
        },
      });
      return brand;
    });
  }

  async update(id: string, dto: UpdateBrandInput) {
    await this.getById(id);
    if (dto.slug) {
      const conflict = await this.prisma.brand.findUnique({ where: { slug: dto.slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already in use`);
      }
    }
    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    // Articles must go first — Article→Collection is Restrict, which would
    // otherwise block the cascade from Brand→Collection. Deleting the brand then
    // cascades collections, marketplaces, members, settings and movements.
    return this.prisma.$transaction(
      async (tx) => {
        await tx.article.deleteMany({ where: { collection: { brandId: id } } });
        return tx.brand.delete({ where: { id } });
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
  }

  async listMembers(brandId: string) {
    return this.prisma.brandMember.findMany({
      where: { brandId },
      include: { user: true, role: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(brandId: string, dto: InviteBrandMemberInput, invitedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException(
        `No user with email "${dto.email}". Ask them to sign in once before inviting.`,
      );
    }
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException('Role not found');

    return this.prisma.brandMember.upsert({
      where: { brandId_userId: { brandId, userId: user.id } },
      create: { brandId, userId: user.id, roleId: dto.roleId, invitedBy },
      update: { roleId: dto.roleId },
      include: { user: true, role: true },
    });
  }

  async updateMemberRole(brandId: string, userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found');
    return this.prisma.brandMember.update({
      where: { brandId_userId: { brandId, userId } },
      data: { roleId },
      include: { user: true, role: true },
    });
  }

  async removeMember(brandId: string, userId: string) {
    await this.prisma.brandMember.delete({
      where: { brandId_userId: { brandId, userId } },
    });
    return { ok: true };
  }
}
