import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(opts: { brandId?: string; take?: number; entity?: string; userId?: string } = {}) {
    const take = Math.min(opts.take ?? 100, 500);
    const where: Prisma.AuditLogWhereInput = {};
    if (opts.brandId) where.brandId = opts.brandId;
    if (opts.entity) where.entity = opts.entity;
    if (opts.userId) where.userId = opts.userId;

    return this.prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  log(input: {
    brandId: string | null;
    userId: string | null;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        brandId: input.brandId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }
}
