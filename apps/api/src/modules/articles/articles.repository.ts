import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const articleInclude = {
  sizes: { orderBy: { size: 'asc' } },
  collection: { select: { brandId: true } },
} satisfies Prisma.ArticleInclude;

@Injectable()
export class ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByCollection(brandId: string, collectionId: string) {
    return this.prisma.article.findMany({
      where: { collectionId, collection: { brandId } },
      include: articleInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(brandId: string, id: string) {
    return this.prisma.article.findFirst({
      where: { id, collection: { brandId } },
      include: articleInclude,
    });
  }

  findByCode(brandId: string, code: string) {
    return this.prisma.article.findFirst({
      where: { code, collection: { brandId } },
      include: articleInclude,
    });
  }

  findByCollectionAndCode(collectionId: string, code: string) {
    return this.prisma.article.findUnique({
      where: { collectionId_code: { collectionId, code } },
    });
  }

  create(data: Prisma.ArticleCreateInput) {
    return this.prisma.article.create({ data, include: articleInclude });
  }

  update(id: string, data: Prisma.ArticleUpdateInput) {
    return this.prisma.article.update({ where: { id }, data, include: articleInclude });
  }

  delete(id: string) {
    return this.prisma.article.delete({ where: { id } });
  }
}
