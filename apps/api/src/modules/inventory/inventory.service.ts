import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  STOCK_MOVEMENT_TYPES,
  SIZES,
  type AllocateMoreInput,
  type ArticleStockBreakdown,
  type AssignArticleToMarketplaceInput,
  type RecordSaleInput,
  type ReturnToWarehouseInput,
  type SalesReportCommitInput,
  type SalesReportCommitResult,
  type SalesReportPreview,
  type SalesReportPreviewInput,
  type SalesReportPreviewItem,
  type Size,
  type UndoSaleInput,
  type UndoWarehouseSaleInput,
  type UpdateSalePriceInput,
  type WarehouseSaleInput,
} from '@bilal/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

// Shape loaded to match a sale report (keyed by per-size SKU) to allocated stock.
const saleIndexInclude = {
  article: {
    select: {
      id: true,
      code: true,
      name: true,
      collection: { select: { name: true } },
      sizes: { select: { size: true, sku: true } },
    },
  },
  stocks: { select: { id: true, size: true, allocatedQuantity: true } },
} satisfies Prisma.MarketplaceArticleInclude;

type SaleIndexMarketplaceArticle = Prisma.MarketplaceArticleGetPayload<{
  include: typeof saleIndexInclude;
}>;

// Prisma interactive transactions default to a 5s timeout, which multi-step
// flows exceed against a remote (pooled) database — the transaction then dies
// mid-flight with "Transaction not found". Give them generous headroom.
const TX_OPTS = { timeout: 30_000, maxWait: 10_000 } as const;

interface SkuIndexEntry {
  marketplaceArticleId: string;
  articleId: string;
  code: string;
  articleName: string;
  collectionName: string;
  size: Size;
  stockId: string | null;
  allocated: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assigns an article to a marketplace and allocates initial stock per size, atomically.
   * Both article and marketplace must belong to the brand.
   */
  async assignArticleToMarketplace(
    brandId: string,
    dto: AssignArticleToMarketplaceInput,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: { id: dto.articleId, collection: { brandId } },
        include: { sizes: true },
      });
      if (!article) throw new NotFoundException(`Article ${dto.articleId} not found in this brand`);

      const marketplace = await tx.marketplace.findFirst({
        where: { id: dto.marketplaceId, brandId },
      });
      if (!marketplace) {
        throw new NotFoundException(`Marketplace ${dto.marketplaceId} not found in this brand`);
      }

      this.verifyAllocations(article.sizes, dto.allocations);

      const marketplaceArticle = await tx.marketplaceArticle.upsert({
        where: {
          marketplaceId_articleId: {
            marketplaceId: dto.marketplaceId,
            articleId: dto.articleId,
          },
        },
        create: {
          marketplaceId: dto.marketplaceId,
          articleId: dto.articleId,
          salePrice: dto.salePrice,
          assignedBy: userId,
        },
        update: { salePrice: dto.salePrice },
      });

      for (const alloc of dto.allocations) {
        await this.applyAllocation(
          tx,
          brandId,
          marketplaceArticle.id,
          article.id,
          dto.marketplaceId,
          alloc.size,
          alloc.quantity,
          dto.salePrice,
          userId,
        );
      }

      return tx.marketplaceArticle.findUnique({
        where: { id: marketplaceArticle.id },
        include: {
          marketplace: true,
          article: { include: { sizes: { orderBy: { size: 'asc' } } } },
          stocks: { orderBy: { size: 'asc' } },
        },
      });
    }, TX_OPTS);
  }

  async allocateMore(brandId: string, dto: AllocateMoreInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.marketplaceArticle.findFirst({
        where: { id: dto.marketplaceArticleId, marketplace: { brandId } },
        include: { article: { include: { sizes: true } } },
      });
      if (!link) throw new NotFoundException(`Allocation ${dto.marketplaceArticleId} not found`);

      this.verifyAllocations(link.article.sizes, dto.allocations);

      for (const alloc of dto.allocations) {
        await this.applyAllocation(
          tx,
          brandId,
          link.id,
          link.articleId,
          link.marketplaceId,
          alloc.size,
          alloc.quantity,
          Number(link.salePrice),
          userId,
        );
      }

      return tx.marketplaceArticle.findUnique({
        where: { id: link.id },
        include: {
          marketplace: true,
          article: { include: { sizes: { orderBy: { size: 'asc' } } } },
          stocks: { orderBy: { size: 'asc' } },
        },
      });
    }, TX_OPTS);
  }

  async updateSalePrice(brandId: string, dto: UpdateSalePriceInput) {
    const link = await this.prisma.marketplaceArticle.findFirst({
      where: { id: dto.marketplaceArticleId, marketplace: { brandId } },
    });
    if (!link) throw new NotFoundException(`Allocation ${dto.marketplaceArticleId} not found`);
    return this.prisma.marketplaceArticle.update({
      where: { id: dto.marketplaceArticleId },
      data: { salePrice: dto.salePrice },
    });
  }

  async recordSale(brandId: string, dto: RecordSaleInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.marketplaceArticle.findFirst({
        where: { id: dto.marketplaceArticleId, marketplace: { brandId } },
        include: { stocks: true },
      });
      if (!link) throw new NotFoundException(`Allocation ${dto.marketplaceArticleId} not found`);

      const stock = link.stocks.find((s) => s.size === dto.size);
      if (!stock || stock.allocatedQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for size ${dto.size} at this marketplace (have ${stock?.allocatedQuantity ?? 0}, need ${dto.quantity})`,
        );
      }

      await tx.marketplaceArticleStock.update({
        where: { id: stock.id },
        data: {
          allocatedQuantity: { decrement: dto.quantity },
          soldQuantity: { increment: dto.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          brandId,
          articleId: link.articleId,
          size: dto.size,
          marketplaceId: link.marketplaceId,
          type: STOCK_MOVEMENT_TYPES.SALE,
          quantity: -dto.quantity,
          unitPrice: link.salePrice,
          notes: dto.notes ?? null,
          createdBy: userId,
        },
      });

      return tx.marketplaceArticleStock.findUnique({ where: { id: stock.id } });
    }, TX_OPTS);
  }

  /**
   * Records a sale made directly from the warehouse (not through a marketplace):
   * decrements warehouse stock, increments the size's direct-sold counter, and
   * writes a SALE movement with no marketplace at the entered price.
   */
  async recordWarehouseSale(brandId: string, dto: WarehouseSaleInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: { id: dto.articleId, collection: { brandId } },
        include: { sizes: true },
      });
      if (!article) throw new NotFoundException(`Article ${dto.articleId} not found in this brand`);

      const row = article.sizes.find((s) => s.size === dto.size);
      if (!row || row.warehouseQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient warehouse stock for size ${dto.size} (have ${row?.warehouseQuantity ?? 0}, need ${dto.quantity})`,
        );
      }

      await tx.articleSize.update({
        where: { id: row.id },
        data: {
          warehouseQuantity: { decrement: dto.quantity },
          soldQuantity: { increment: dto.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          brandId,
          articleId: dto.articleId,
          size: dto.size,
          marketplaceId: null,
          type: STOCK_MOVEMENT_TYPES.SALE,
          quantity: -dto.quantity,
          unitPrice: dto.unitPrice,
          notes: dto.notes ?? 'Sold directly from warehouse',
          createdBy: userId,
        },
      });

      return tx.articleSize.findUnique({ where: { id: row.id } });
    }, TX_OPTS);
  }

  /**
   * Reverses a mistakenly recorded warehouse sale: sold units go back into
   * warehouse stock, and a compensating ADJUSTMENT movement (positive quantity,
   * no marketplace) is written. When a unit price is supplied it offsets the
   * original sale in revenue reports.
   */
  async undoWarehouseSale(brandId: string, dto: UndoWarehouseSaleInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: { id: dto.articleId, collection: { brandId } },
        include: { sizes: true },
      });
      if (!article) throw new NotFoundException(`Article ${dto.articleId} not found in this brand`);

      const row = article.sizes.find((s) => s.size === dto.size);
      if (!row || row.soldQuantity < dto.quantity) {
        throw new BadRequestException(
          `Cannot undo ${dto.quantity} sold for size ${dto.size} (only ${row?.soldQuantity ?? 0} recorded as sold from warehouse)`,
        );
      }

      await tx.articleSize.update({
        where: { id: row.id },
        data: {
          soldQuantity: { decrement: dto.quantity },
          warehouseQuantity: { increment: dto.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          brandId,
          articleId: dto.articleId,
          size: dto.size,
          marketplaceId: null,
          type: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice ?? null,
          notes: dto.notes ?? 'Warehouse sale correction (undo)',
          createdBy: userId,
        },
      });

      return tx.articleSize.findUnique({ where: { id: row.id } });
    }, TX_OPTS);
  }

  /**
   * Reverses a mistakenly recorded sale: moves units from sold back to the
   * marketplace's allocated stock and writes a compensating ADJUSTMENT movement
   * (positive quantity, priced at the current sale price) so the ledger shows
   * both the original sale and its correction.
   */
  async undoSale(brandId: string, dto: UndoSaleInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.marketplaceArticle.findFirst({
        where: { id: dto.marketplaceArticleId, marketplace: { brandId } },
        include: { stocks: true },
      });
      if (!link) throw new NotFoundException(`Allocation ${dto.marketplaceArticleId} not found`);

      const stock = link.stocks.find((s) => s.size === dto.size);
      if (!stock || stock.soldQuantity < dto.quantity) {
        throw new BadRequestException(
          `Cannot undo ${dto.quantity} sold for size ${dto.size} (only ${stock?.soldQuantity ?? 0} recorded as sold)`,
        );
      }

      await tx.marketplaceArticleStock.update({
        where: { id: stock.id },
        data: {
          soldQuantity: { decrement: dto.quantity },
          allocatedQuantity: { increment: dto.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          brandId,
          articleId: link.articleId,
          size: dto.size,
          marketplaceId: link.marketplaceId,
          type: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
          quantity: dto.quantity,
          unitPrice: link.salePrice,
          notes: dto.notes ?? 'Sale correction (undo)',
          createdBy: userId,
        },
      });

      return tx.marketplaceArticleStock.findUnique({ where: { id: stock.id } });
    }, TX_OPTS);
  }

  async returnToWarehouse(brandId: string, dto: ReturnToWarehouseInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.marketplaceArticle.findFirst({
        where: { id: dto.marketplaceArticleId, marketplace: { brandId } },
        include: { stocks: true, article: { include: { sizes: true } } },
      });
      if (!link) throw new NotFoundException(`Allocation ${dto.marketplaceArticleId} not found`);

      const stock = link.stocks.find((s) => s.size === dto.size);
      if (!stock || stock.allocatedQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient allocated stock for size ${dto.size} (have ${stock?.allocatedQuantity ?? 0})`,
        );
      }

      const warehouseRow =
        link.article.sizes.find((s) => s.size === dto.size) ??
        (await tx.articleSize.create({
          data: { articleId: link.articleId, size: dto.size, warehouseQuantity: 0 },
        }));

      await tx.articleSize.update({
        where: { id: warehouseRow.id },
        data: { warehouseQuantity: { increment: dto.quantity } },
      });
      await tx.marketplaceArticleStock.update({
        where: { id: stock.id },
        data: { allocatedQuantity: { decrement: dto.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          brandId,
          articleId: link.articleId,
          size: dto.size,
          marketplaceId: link.marketplaceId,
          type: STOCK_MOVEMENT_TYPES.RETURN_TO_WAREHOUSE,
          quantity: dto.quantity,
          notes: dto.notes ?? null,
          createdBy: userId,
        },
      });

      return { ok: true };
    }, TX_OPTS);
  }

  async getArticleStockBreakdown(brandId: string, articleId: string): Promise<ArticleStockBreakdown> {
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, collection: { brandId } },
      include: {
        sizes: { orderBy: { size: 'asc' } },
        marketplaceArticles: {
          include: { marketplace: true, stocks: { orderBy: { size: 'asc' } } },
        },
      },
    });
    if (!article) throw new NotFoundException(`Article ${articleId} not found`);

    const threshold = await this.getLowStockThreshold(brandId);

    const totalsBySize = SIZES.map((size) => {
      const warehouse = article.sizes.find((s) => s.size === size)?.warehouseQuantity ?? 0;
      const allocatedAcross = article.marketplaceArticles.reduce(
        (sum, ma) => sum + (ma.stocks.find((s) => s.size === size)?.allocatedQuantity ?? 0),
        0,
      );
      const total = warehouse + allocatedAcross;
      return {
        size,
        total,
        warehouseUnallocated: warehouse,
        isLowStock: total > 0 && total < threshold,
      };
    });

    const byMarketplace = article.marketplaceArticles.map((ma) => ({
      marketplaceId: ma.marketplaceId,
      marketplaceName: ma.marketplace.name,
      marketplaceColor: ma.marketplace.color,
      salePrice: Number(ma.salePrice),
      sizes: SIZES.map((size) => {
        const s = ma.stocks.find((x) => x.size === size);
        return {
          size,
          allocated: s?.allocatedQuantity ?? 0,
          sold: s?.soldQuantity ?? 0,
          isLowStock: (s?.allocatedQuantity ?? 0) > 0 && (s?.allocatedQuantity ?? 0) < threshold,
        };
      }),
    }));

    return { articleId, totals: totalsBySize, byMarketplace };
  }

  async getLowStockArticles(brandId: string) {
    const threshold = await this.getLowStockThreshold(brandId);
    const articles = await this.prisma.article.findMany({
      where: { collection: { brandId } },
      include: {
        collection: true,
        sizes: { orderBy: { size: 'asc' } },
        marketplaceArticles: {
          include: { marketplace: true, stocks: { orderBy: { size: 'asc' } } },
        },
      },
    });

    const flagged = articles
      .map((a) => {
        const lowSizes = SIZES.filter((size) => {
          const wh = a.sizes.find((s) => s.size === size)?.warehouseQuantity ?? 0;
          const alloc = a.marketplaceArticles.reduce(
            (sum, ma) => sum + (ma.stocks.find((s) => s.size === size)?.allocatedQuantity ?? 0),
            0,
          );
          const total = wh + alloc;
          return total > 0 && total < threshold;
        });
        return lowSizes.length > 0 ? { article: a, lowSizes, threshold } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return flagged;
  }

  async listMovementsForArticle(brandId: string, articleId: string, take = 100) {
    // Ensure article belongs to brand
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, collection: { brandId } },
      select: { id: true },
    });
    if (!article) throw new ForbiddenException('Article not found in this brand');

    return this.prisma.stockMovement.findMany({
      where: { articleId, brandId },
      include: { marketplace: true, creator: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Diffs an uploaded daily stock snapshot against the marketplace's current
   * allocated stock. Each report row's `quantity` is the remaining stock now, so
   * pieces sold = currentAllocated − reportRemaining (when positive). Read-only —
   * nothing is changed until the user confirms and calls {@link commitSalesReport}.
   */
  async previewSalesReport(
    brandId: string,
    dto: SalesReportPreviewInput,
  ): Promise<SalesReportPreview> {
    const marketplace = await this.prisma.marketplace.findFirst({
      where: { id: dto.marketplaceId, brandId },
      select: { id: true },
    });
    if (!marketplace) throw new NotFoundException(`Marketplace ${dto.marketplaceId} not found`);

    const assigned = await this.prisma.marketplaceArticle.findMany({
      where: { marketplaceId: dto.marketplaceId, marketplace: { brandId } },
      include: saleIndexInclude,
    });
    const index = this.indexBySku(assigned);

    const items: SalesReportPreviewItem[] = [];
    let totalToDeduct = 0;
    let matchedRows = 0;
    let unmatchedRows = 0;
    let unchangedRows = 0;
    const seen = new Set<string>();

    for (const row of dto.rows) {
      if (seen.has(row.sku)) continue;
      seen.add(row.sku);

      const entry = index.get(row.sku);
      if (!entry) {
        unmatchedRows += 1;
        continue;
      }
      matchedRows += 1;
      const willDeduct = entry.allocated - row.quantity;
      if (willDeduct > 0) {
        totalToDeduct += willDeduct;
        items.push({
          marketplaceArticleId: entry.marketplaceArticleId,
          articleId: entry.articleId,
          code: entry.code,
          articleName: entry.articleName,
          collectionName: entry.collectionName,
          size: entry.size,
          sku: row.sku,
          currentAllocated: entry.allocated,
          reportRemaining: row.quantity,
          willDeduct,
        });
      } else {
        unchangedRows += 1;
      }
    }

    items.sort(
      (a, b) =>
        a.collectionName.localeCompare(b.collectionName) ||
        a.articleName.localeCompare(b.articleName) ||
        SIZES.indexOf(a.size) - SIZES.indexOf(b.size),
    );

    return {
      marketplaceId: dto.marketplaceId,
      items,
      totalToDeduct,
      matchedRows,
      unmatchedRows,
      unchangedRows,
    };
  }

  /**
   * Applies confirmed deductions from a daily sale report: decrements allocated
   * stock, increments sold, and writes a SALE movement per line — all atomically.
   * Each deduction is clamped to what's actually allocated so stock never goes
   * negative; lines that can't be applied are counted as skipped.
   */
  async commitSalesReport(
    brandId: string,
    dto: SalesReportCommitInput,
    userId: string,
  ): Promise<SalesReportCommitResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const marketplace = await tx.marketplace.findFirst({
          where: { id: dto.marketplaceId, brandId },
          select: { id: true },
        });
        if (!marketplace) throw new NotFoundException(`Marketplace ${dto.marketplaceId} not found`);

        const assigned = await tx.marketplaceArticle.findMany({
          where: { marketplaceId: dto.marketplaceId, marketplace: { brandId } },
          include: saleIndexInclude,
        });
        const index = this.indexBySku(assigned);

        let applied = 0;
        let totalDeducted = 0;
        let skipped = 0;
        const seen = new Set<string>();

        for (const d of dto.deductions) {
          if (seen.has(d.sku)) {
            skipped += 1;
            continue;
          }
          seen.add(d.sku);

          const entry = index.get(d.sku);
          if (!entry || !entry.stockId || entry.allocated <= 0) {
            skipped += 1;
            continue;
          }
          const qty = Math.min(d.quantity, entry.allocated);
          if (qty <= 0) {
            skipped += 1;
            continue;
          }

          await tx.marketplaceArticleStock.update({
            where: { id: entry.stockId },
            data: {
              allocatedQuantity: { decrement: qty },
              soldQuantity: { increment: qty },
            },
          });
          await tx.stockMovement.create({
            data: {
              brandId,
              articleId: entry.articleId,
              size: entry.size,
              marketplaceId: dto.marketplaceId,
              type: STOCK_MOVEMENT_TYPES.SALE,
              quantity: -qty,
              notes: dto.notes ?? 'Daily sale report',
              createdBy: userId,
            },
          });
          applied += 1;
          totalDeducted += qty;
        }

        return { applied, totalDeducted, skipped };
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
  }

  // ---------- private helpers ----------

  /** Builds a per-size-SKU → allocated-stock lookup for one marketplace. */
  private indexBySku(assigned: SaleIndexMarketplaceArticle[]): Map<string, SkuIndexEntry> {
    const index = new Map<string, SkuIndexEntry>();
    for (const ma of assigned) {
      const stockBySize = new Map(ma.stocks.map((s) => [s.size, s]));
      for (const size of ma.article.sizes) {
        if (!size.sku) continue;
        const stock = stockBySize.get(size.size);
        index.set(size.sku, {
          marketplaceArticleId: ma.id,
          articleId: ma.article.id,
          code: ma.article.code,
          articleName: ma.article.name,
          collectionName: ma.article.collection.name,
          size: size.size,
          stockId: stock?.id ?? null,
          allocated: stock?.allocatedQuantity ?? 0,
        });
      }
    }
    return index;
  }

  private verifyAllocations(
    warehouseSizes: { size: Size; warehouseQuantity: number }[],
    allocations: { size: Size; quantity: number }[],
  ) {
    const totalsBySize = new Map<Size, number>();
    for (const a of allocations) {
      totalsBySize.set(a.size, (totalsBySize.get(a.size) ?? 0) + a.quantity);
    }
    for (const [size, qty] of totalsBySize) {
      const warehouse = warehouseSizes.find((s) => s.size === size);
      if (!warehouse) {
        throw new BadRequestException(`Article has no warehouse stock for size ${size}`);
      }
      if (warehouse.warehouseQuantity < qty) {
        throw new ConflictException(
          `Insufficient warehouse stock for size ${size} (have ${warehouse.warehouseQuantity}, need ${qty})`,
        );
      }
    }
  }

  private async applyAllocation(
    tx: Prisma.TransactionClient,
    brandId: string,
    marketplaceArticleId: string,
    articleId: string,
    marketplaceId: string,
    size: Size,
    quantity: number,
    unitPrice: number,
    userId: string,
  ) {
    await tx.articleSize.updateMany({
      where: { articleId, size },
      data: { warehouseQuantity: { decrement: quantity } },
    });
    await tx.marketplaceArticleStock.upsert({
      where: { marketplaceArticleId_size: { marketplaceArticleId, size } },
      create: { marketplaceArticleId, size, allocatedQuantity: quantity, soldQuantity: 0 },
      update: { allocatedQuantity: { increment: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        brandId,
        articleId,
        size,
        marketplaceId,
        type: STOCK_MOVEMENT_TYPES.ALLOCATE_TO_MARKETPLACE,
        quantity,
        unitPrice,
        notes: 'Allocated from warehouse',
        createdBy: userId,
      },
    });
  }

  private async getLowStockThreshold(brandId: string): Promise<number> {
    const row = await this.prisma.settings.findUnique({
      where: { brandId_key: { brandId, key: 'low_stock_threshold' } },
    });
    if (!row) return DEFAULT_LOW_STOCK_THRESHOLD;
    const v = row.value;
    if (typeof v === 'number') return v;
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
}
