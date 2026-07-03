import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MarketplacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(brandId: string, includeInactive = false) {
    return this.prisma.marketplace.findMany({
      where: {
        brandId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(brandId: string, id: string) {
    return this.prisma.marketplace.findFirst({ where: { id, brandId } });
  }

  create(data: Prisma.MarketplaceCreateInput) {
    return this.prisma.marketplace.create({ data });
  }

  update(id: string, data: Prisma.MarketplaceUpdateInput) {
    return this.prisma.marketplace.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.marketplace.delete({ where: { id } });
  }

  findArticlesInMarketplace(brandId: string, marketplaceId: string) {
    return this.prisma.marketplaceArticle.findMany({
      where: { marketplaceId, marketplace: { brandId } },
      include: {
        article: {
          include: {
            sizes: { orderBy: { size: 'asc' } },
            collection: { select: { id: true, name: true } },
          },
        },
        stocks: { orderBy: { size: 'asc' } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
