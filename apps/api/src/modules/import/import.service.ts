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
   * Bulk-imports the factory stock CSV into collections → articles → sizes,
   * with sync (upsert) semantics — re-uploading a sheet never duplicates:
   *
   * - articles in the sheet AND the system are updated in place (stock is
   *   replaced with the sheet quantity, logged as an adjustment)
   * - articles only in the sheet are created
   * - articles only in the system are left untouched
   *
   * Matching is per-size-SKU first (case-insensitive, brand-wide) since SKUs
   * are the durable product identity — this also absorbs collection renames
   * and form-created articles whose auto-code differs from the CSV's SKU stem.
   * Articles without a SKU hit fall back to (collection, code) matching.
   * Rows are grouped by (collection, SKU stem) so each real product becomes one
   * article carrying its per-size SKUs; new rows are written with `createMany`
   * (client-generated UUIDs) so a full ~1200-row catalogue lands in a handful
   * of queries.
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
    const existingCollIds = new Set(existingColls.map((c) => c.id));

    // Every article in the brand, so sheet rows can be matched wherever the
    // article currently lives (SKUs are unique product identities brand-wide).
    const existingArticles = await this.prisma.article.findMany({
      where: { collection: { brandId } },
      select: {
        id: true,
        collectionId: true,
        code: true,
        name: true,
        imageUrl: true,
        sizes: { select: { id: true, size: true, sku: true, warehouseQuantity: true } },
      },
    });
    type ExistingArticle = (typeof existingArticles)[number];

    const artKey = (collectionId: string, code: string) => `${collectionId}::${code}`;
    const articleByKey = new Map(existingArticles.map((a) => [artKey(a.collectionId, a.code), a]));
    // Case-insensitive fallback: form-created articles auto-generate UPPERCASE
    // codes while CSV stems keep the sheet's casing.
    const articleByCiKey = new Map(
      existingArticles.map((a) => [artKey(a.collectionId, a.code.toLowerCase()), a]),
    );
    const articleById = new Map(existingArticles.map((a) => [a.id, a]));

    // Per-size SKU → owning article (first wins on the rare duplicate SKU).
    const articleIdBySku = new Map<string, string>();
    for (const a of existingArticles) {
      for (const s of a.sizes) {
        const key = s.sku?.trim().toLowerCase();
        if (key && !articleIdBySku.has(key)) articleIdBySku.set(key, a.id);
      }
    }

    // Each existing article can absorb at most one sheet group — prevents two
    // sheet articles with overlapping SKUs from double-updating the same row.
    const claimed = new Set<string>();

    /** The existing article owning most of this sheet group's SKUs, if any. */
    const matchBySkus = (sizes: { sku: string }[]): ExistingArticle | undefined => {
      const votes = new Map<string, number>();
      for (const s of sizes) {
        const id = articleIdBySku.get(s.sku.trim().toLowerCase());
        if (id && !claimed.has(id)) votes.set(id, (votes.get(id) ?? 0) + 1);
      }
      let best: string | undefined;
      let bestVotes = 0;
      for (const [id, n] of votes) {
        if (n > bestVotes) {
          best = id;
          bestVotes = n;
        }
      }
      return best ? articleById.get(best) : undefined;
    };

    // Collections are minted lazily — only when a genuinely new article needs
    // one — so a renamed collection in the sheet doesn't spawn an empty copy
    // when all its articles matched (by SKU) into their current collections.
    const newCollections: Prisma.CollectionCreateManyInput[] = [];
    const resolveCollectionId = (name: string): string => {
      const key = name.trim().toLowerCase();
      let id = collIdByName.get(key);
      if (!id) {
        id = randomUUID();
        collIdByName.set(key, id);
        newCollections.push({ id, brandId, name: name.trim(), createdBy: userId });
        result.collectionsCreated += 1;
      }
      return id;
    };
    for (const gc of collections) {
      if (collIdByName.has(gc.name.trim().toLowerCase())) result.collectionsMatched += 1;
    }

    // Codes are unique per collection; suffix a created article's code if an
    // unmatched existing article (or an earlier create) already holds it.
    const takenCodes = new Set(
      existingArticles.map((a) => `${a.collectionId}::${a.code.toLowerCase()}`),
    );
    const uniqueCode = (collectionId: string, code: string): string => {
      let candidate = code;
      for (let n = 2; takenCodes.has(`${collectionId}::${candidate.toLowerCase()}`); n += 1) {
        candidate = `${code}-${n}`;
      }
      takenCodes.add(`${collectionId}::${candidate.toLowerCase()}`);
      return candidate;
    };

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
      const sheetCollectionId = collIdByName.get(gc.name.trim().toLowerCase());
      for (const ga of gc.articles) {
        // SKU match first (works across collections and code spellings); then
        // (collection, code), exact and case-insensitive, within the sheet's
        // collection when it already exists.
        let existing = matchBySkus(ga.sizes);
        if (!existing && sheetCollectionId && existingCollIds.has(sheetCollectionId)) {
          const byCode =
            articleByKey.get(artKey(sheetCollectionId, ga.code)) ??
            articleByCiKey.get(artKey(sheetCollectionId, ga.code.toLowerCase()));
          if (byCode && !claimed.has(byCode.id)) existing = byCode;
        }

        if (!existing) {
          const articleId = randomUUID();
          const collectionId = resolveCollectionId(gc.name);
          newArticles.push({
            id: articleId,
            collectionId,
            name: ga.name,
            code: uniqueCode(collectionId, ga.code),
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
        claimed.add(existing.id);

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
