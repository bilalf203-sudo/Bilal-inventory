import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SIZES,
  STOCK_MOVEMENT_TYPES,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '@bilal/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ArticlesRepository } from './articles.repository';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ArticlesRepository,
    private readonly storage: StorageService,
  ) {}

  listByCollection(brandId: string, collectionId: string) {
    return this.repo.findManyByCollection(brandId, collectionId);
  }

  async getById(brandId: string, id: string) {
    const a = await this.repo.findById(brandId, id);
    if (!a) throw new NotFoundException(`Article ${id} not found`);
    return a;
  }

  /**
   * Creates an article, its size rows, and INITIAL_STOCK movements in one transaction.
   * Article code is unique within a collection; when omitted it's derived from
   * the per-size SKUs (or the name).
   */
  async create(brandId: string, dto: CreateArticleInput, userId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: dto.collectionId, brandId },
    });
    if (!collection) {
      throw new ForbiddenException(`Collection ${dto.collectionId} does not belong to this brand`);
    }

    let code: string;
    if (dto.code) {
      const existing = await this.repo.findByCollectionAndCode(dto.collectionId, dto.code);
      if (existing) {
        throw new ConflictException(`Article code "${dto.code}" already exists in this collection`);
      }
      code = dto.code;
    } else {
      code = await this.generateCode(dto);
    }

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          name: dto.name,
          code,
          description: dto.description ?? null,
          purchasePrice: dto.purchasePrice,
          imageUrl: dto.imageUrl ?? null,
          collection: { connect: { id: dto.collectionId } },
          creator: { connect: { id: userId } },
          sizes: {
            create: dto.sizes.map((s) => ({
              size: s.size,
              sku: s.sku ?? null,
              warehouseQuantity: s.quantity,
            })),
          },
        },
        include: { sizes: { orderBy: { size: 'asc' } } },
      });

      const movements: Prisma.StockMovementCreateManyInput[] = dto.sizes
        .filter((s) => s.quantity > 0)
        .map((s) => ({
          brandId,
          articleId: article.id,
          size: s.size,
          marketplaceId: null,
          type: STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
          quantity: s.quantity,
          unitPrice: dto.purchasePrice,
          notes: 'Initial warehouse stock',
          createdBy: userId,
        }));
      if (movements.length > 0) {
        await tx.stockMovement.createMany({ data: movements });
      }

      return article;
    });
  }

  async update(brandId: string, id: string, dto: UpdateArticleInput, userId: string) {
    const article = await this.getById(brandId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          purchasePrice: dto.purchasePrice,
          imageUrl: dto.imageUrl,
        },
        include: { sizes: { orderBy: { size: 'asc' } } },
      });

      if (dto.sizes) {
        for (const size of dto.sizes) {
          const existing = article.sizes.find((s) => s.size === size.size);
          if (!existing) {
            await tx.articleSize.create({
              data: {
                articleId: id,
                size: size.size,
                sku: size.sku ?? null,
                warehouseQuantity: size.quantity,
              },
            });
            if (size.quantity > 0) {
              await tx.stockMovement.create({
                data: {
                  brandId,
                  articleId: id,
                  size: size.size,
                  type: STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
                  quantity: size.quantity,
                  unitPrice: updated.purchasePrice,
                  notes: 'Added new size to article',
                  createdBy: userId,
                },
              });
            }
          } else {
            const delta = size.quantity - existing.warehouseQuantity;
            const skuChanged = size.sku !== undefined && (size.sku || null) !== existing.sku;
            if (delta !== 0 || skuChanged) {
              await tx.articleSize.update({
                where: { id: existing.id },
                data: {
                  warehouseQuantity: size.quantity,
                  ...(skuChanged ? { sku: size.sku || null } : {}),
                },
              });
            }
            if (delta !== 0) {
              await tx.stockMovement.create({
                data: {
                  brandId,
                  articleId: id,
                  size: size.size,
                  type: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
                  quantity: delta,
                  notes: 'Manual warehouse adjustment',
                  createdBy: userId,
                },
              });
            }
          }
        }
      }

      return tx.article.findUnique({
        where: { id },
        include: { sizes: { orderBy: { size: 'asc' } } },
      });
    });
  }

  async remove(brandId: string, id: string) {
    const article = await this.getById(brandId, id);
    if (article.imageUrl) {
      await this.storage.deleteByUrl(article.imageUrl);
    }
    return this.repo.delete(id);
  }

  async setImage(brandId: string, id: string, imageUrl: string) {
    const article = await this.getById(brandId, id);
    if (article.imageUrl && article.imageUrl !== imageUrl) {
      await this.storage.deleteByUrl(article.imageUrl);
    }
    return this.repo.update(id, { imageUrl });
  }

  /** Uppercases and keeps only [A-Z0-9_-], collapsing everything else to dashes. */
  private static slugifyCode(input: string): string {
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 76);
  }

  /**
   * Derives an article code when none was entered: the common prefix of the
   * per-size SKUs (minus a trailing size token like "-M"), falling back to the
   * article name. A numeric suffix is appended until the code is unique within
   * the collection.
   */
  private async generateCode(dto: CreateArticleInput): Promise<string> {
    const skus = dto.sizes.map((s) => s.sku?.trim()).filter((s): s is string => !!s);
    let base = '';
    if (skus.length > 0) {
      let prefix = skus[0];
      for (const sku of skus.slice(1)) {
        while (prefix && !sku.startsWith(prefix)) prefix = prefix.slice(0, -1);
      }
      prefix = prefix.replace(new RegExp(`[-_](${SIZES.join('|')})$`, 'i'), '');
      base = ArticlesService.slugifyCode(prefix);
    }
    if (!base) base = ArticlesService.slugifyCode(dto.name);
    if (!base) base = 'ART';

    let code = base;
    for (let n = 2; await this.repo.findByCollectionAndCode(dto.collectionId, code); n += 1) {
      code = `${base}-${n}`;
    }
    return code;
  }
}
