import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform-wide user list (platform admin). */
  async findAll() {
    return this.prisma.user.findMany({
      include: {
        brandMemberships: { include: { brand: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { brandMemberships: { include: { brand: true, role: true } } },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async setActive(id: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async setPlatformAdmin(id: string, isPlatformAdmin: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isPlatformAdmin } });
  }

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
