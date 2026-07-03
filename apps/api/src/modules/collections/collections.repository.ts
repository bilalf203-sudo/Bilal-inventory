import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(brandId: string, search?: string) {
    return this.prisma.collection.findMany({
      where: {
        brandId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { _count: { select: { articles: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(brandId: string, id: string) {
    return this.prisma.collection.findFirst({
      where: { id, brandId },
      include: { _count: { select: { articles: true } } },
    });
  }

  create(data: Prisma.CollectionCreateInput) {
    return this.prisma.collection.create({
      data,
      include: { _count: { select: { articles: true } } },
    });
  }

  update(id: string, data: Prisma.CollectionUpdateInput) {
    return this.prisma.collection.update({
      where: { id },
      data,
      include: { _count: { select: { articles: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.collection.delete({ where: { id } });
  }
}
