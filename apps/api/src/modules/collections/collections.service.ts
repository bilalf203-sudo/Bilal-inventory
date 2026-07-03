import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCollectionInput, UpdateCollectionInput } from '@bilal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CollectionsRepository } from './collections.repository';

type CollectionRow = { _count?: { articles: number } } & Record<string, unknown>;

function withArticleCount<T extends CollectionRow>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, articleCount: _count?.articles ?? 0 };
}

@Injectable()
export class CollectionsService {
  constructor(
    private readonly repo: CollectionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(brandId: string, search?: string) {
    const rows = await this.repo.findMany(brandId, search);
    return rows.map(withArticleCount);
  }

  async getById(brandId: string, id: string) {
    const c = await this.repo.findById(brandId, id);
    if (!c) throw new NotFoundException(`Collection ${id} not found`);
    return withArticleCount(c);
  }

  async create(brandId: string, dto: CreateCollectionInput, userId: string) {
    const created = await this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      brand: { connect: { id: brandId } },
      creator: { connect: { id: userId } },
    });
    return withArticleCount(created);
  }

  async update(brandId: string, id: string, dto: UpdateCollectionInput) {
    await this.getById(brandId, id);
    const updated = await this.repo.update(id, {
      name: dto.name,
      description: dto.description,
    });
    return withArticleCount(updated);
  }

  /**
   * Deletes a collection and everything under it. The Article→Collection FK is
   * Restrict, so its articles must go first; deleting them cascades their sizes,
   * marketplace assignments, allocated/sold stock and stock movements.
   */
  async remove(brandId: string, id: string) {
    await this.getById(brandId, id);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.article.deleteMany({ where: { collectionId: id } });
        return tx.collection.delete({ where: { id } });
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
  }

  /** Wipes every collection (and its articles) for the brand — a full reset. */
  async clearAll(brandId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.article.deleteMany({ where: { collection: { brandId } } });
        const deleted = await tx.collection.deleteMany({ where: { brandId } });
        return { deletedCollections: deleted.count };
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
  }
}
