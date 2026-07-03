import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  STOCK_MOVEMENT_TYPES,
  groupImportRows,
  type ImportResult,
  type ImportWarehouseInput,
  type ParsedImportRow,
} from '@bilal/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bulk-imports the factory stock CSV into collections → articles → sizes.
   *
   * Rows are grouped by (collection, SKU stem) so each real product becomes one
   * article carrying its per-size SKUs. New rows are written with `createMany`
   * (client-generated UUIDs) so a full ~1200-row catalogue lands in a handful of
   * queries; rows for articles/sizes that already exist are updated in place and
   * logged as adjustments.
   */
  async importWarehouse(
    brandId: string,
    input: ImportWarehouseInput,
    userId: string,
  ): Promise<ImportResult> {
    const parsed: ParsedImportRow[] = input.rows.map((r) => ({
      collectionName: r.collectionName,
      articleName: r.articleName,
      sku: r.sku,
      size: r.size,
      quantity: r.quantity,
      imageUrl: r.imageUrl ?? null,
    }));

    const { collections, duplicateSizes } = groupImportRows(parsed);

    const result: ImportResult = {
      rowsReceived: input.rows.length,
      collectionsCreated: 0,
      collectionsMatched: 0,
      articlesCreated: 0,
      articlesUpdated: 0,
      sizesCreated: 0,
      sizesUpdated: 0,
      duplicateSizes: duplicateSizes.length,
    };

    // ---- Reads up front (no transaction — read-only, and keeps the write
    // transaction short so it doesn't stall over the pooler) ----
    const existingColls = await this.prisma.collection.findMany({
      where: { brandId },
      select: { id: true, name: true },
    });
    const collIdByName = new Map(existingColls.map((c) => [c.name.trim().toLowerCase(), c.id]));

    // Resolve every collection to an id, minting ids for new ones up front so
    // articles can reference them without a round-trip per collection.
    const newCollections: Prisma.CollectionCreateManyInput[] = [];
    for (const gc of collections) {
      const key = gc.name.toLowerCase();
      if (!collIdByName.has(key)) {
        const collectionId = randomUUID();
        collIdByName.set(key, collectionId);
        newCollections.push({ id: collectionId, brandId, name: gc.name, createdBy: userId });
        result.collectionsCreated += 1;
      } else {
        result.collectionsMatched += 1;
      }
    }

    // Existing articles across every touched collection in a single query
    // (freshly-minted collection ids simply match nothing).
    const existingArticles = await this.prisma.article.findMany({
      where: { collectionId: { in: Array.from(collIdByName.values()) } },
      select: {
        id: true,
        collectionId: true,
        code: true,
        name: true,
        imageUrl: true,
        sizes: { select: { id: true, size: true, sku: true, warehouseQuantity: true } },
      },
    });
    const artKey = (collectionId: string, code: string) => `${collectionId}::${code}`;
    const articleByKey = new Map(existingArticles.map((a) => [artKey(a.collectionId, a.code), a]));

    // ---- Plan the writes ----
    const newArticles: Prisma.ArticleCreateManyInput[] = [];
    const newSizes: Prisma.ArticleSizeCreateManyInput[] = [];
    const newMovements: Prisma.StockMovementCreateManyInput[] = [];
    const articleUpdates: { id: string; name: string; imageUrl: string | null }[] = [];
    const sizeUpdates: { id: string; sku: string; warehouseQuantity: number }[] = [];

    const pushInitialStock = (articleId: string, size: ParsedImportRow['size'], quantity: number) => {
      if (quantity > 0) {
        newMovements.push({
          brandId,
          articleId,
          size,
          type: STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
          quantity,
          notes: 'Imported from factory stock CSV',
          createdBy: userId,
        });
      }
    };

    for (const gc of collections) {
      const collectionId = collIdByName.get(gc.name.toLowerCase())!;
      for (const ga of gc.articles) {
        const existing = articleByKey.get(artKey(collectionId, ga.code));

        if (!existing) {
          const articleId = randomUUID();
          newArticles.push({
            id: articleId,
            collectionId,
            name: ga.name,
            code: ga.code,
            purchasePrice: 0,
            imageUrl: ga.imageUrl,
            createdBy: userId,
          });
          for (const s of ga.sizes) {
            newSizes.push({ id: randomUUID(), articleId, size: s.size, sku: s.sku, warehouseQuantity: s.quantity });
            result.sizesCreated += 1;
            pushInitialStock(articleId, s.size, s.quantity);
          }
          result.articlesCreated += 1;
          continue;
        }

        // Existing article — only touch it when something actually changed.
        if (existing.name !== ga.name || (ga.imageUrl && ga.imageUrl !== existing.imageUrl)) {
          articleUpdates.push({ id: existing.id, name: ga.name, imageUrl: ga.imageUrl });
          result.articlesUpdated += 1;
        }

        const sizeRow = new Map(existing.sizes.map((s) => [s.size, s]));
        for (const s of ga.sizes) {
          const row = sizeRow.get(s.size);
          if (!row) {
            newSizes.push({ id: randomUUID(), articleId: existing.id, size: s.size, sku: s.sku, warehouseQuantity: s.quantity });
            result.sizesCreated += 1;
            pushInitialStock(existing.id, s.size, s.quantity);
          } else if (row.sku !== s.sku || row.warehouseQuantity !== s.quantity) {
            const delta = s.quantity - row.warehouseQuantity;
            sizeUpdates.push({ id: row.id, sku: s.sku, warehouseQuantity: s.quantity });
            result.sizesUpdated += 1;
            if (delta !== 0) {
              newMovements.push({
                brandId,
                articleId: existing.id,
                size: s.size,
                type: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
                quantity: delta,
                notes: 'Adjusted by factory stock CSV import',
                createdBy: userId,
              });
            }
          }
        }
      }
    }

    // ---- Writes: one short transaction, almost entirely bulk createMany ----
    await this.prisma.$transaction(
      async (tx) => {
        if (newCollections.length) await tx.collection.createMany({ data: newCollections });
        if (newArticles.length) await tx.article.createMany({ data: newArticles });
        if (newSizes.length) await tx.articleSize.createMany({ data: newSizes });
        for (const u of articleUpdates) {
          await tx.article.update({
            where: { id: u.id },
            data: { name: u.name, ...(u.imageUrl ? { imageUrl: u.imageUrl } : {}) },
          });
        }
        for (const u of sizeUpdates) {
          await tx.articleSize.update({
            where: { id: u.id },
            data: { sku: u.sku, warehouseQuantity: u.warehouseQuantity },
          });
        }
        if (newMovements.length) await tx.stockMovement.createMany({ data: newMovements });
      },
      { timeout: 120_000, maxWait: 30_000 },
    );

    return result;
  }
}
