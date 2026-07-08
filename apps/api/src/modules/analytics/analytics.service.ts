import { Injectable } from '@nestjs/common';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  SIZES,
  STOCK_MOVEMENT_TYPES,
  type AnalyticsSummary,
  type AnalyticsTotals,
  type ArticleAnalyticsRow,
  type ArticleMarketplaceStock,
  type ArticleStockStatus,
  type MarketplaceAnalytics,
  type Size,
  type SizeAnalytics,
} from '@bilal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Rounds accumulated currency sums to cents to avoid float drift. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(brandId: string, collectionId?: string): Promise<AnalyticsSummary> {
    const [threshold, collections, marketplaces, articles, warehouseSaleMovements] =
      await Promise.all([
        this.getLowStockThreshold(brandId),
        this.prisma.collection.count({
          where: { brandId, ...(collectionId ? { id: collectionId } : {}) },
        }),
        this.prisma.marketplace.findMany({
          where: { brandId },
          select: { id: true, name: true, color: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.article.findMany({
          where: { collection: { brandId }, ...(collectionId ? { collectionId } : {}) },
          select: {
            id: true,
            code: true,
            name: true,
            imageUrl: true,
            purchasePrice: true,
            collection: { select: { id: true, name: true } },
            sizes: { select: { size: true, warehouseQuantity: true, soldQuantity: true } },
            marketplaceArticles: {
              select: {
                marketplaceId: true,
                salePrice: true,
                stocks: { select: { size: true, allocatedQuantity: true, soldQuantity: true } },
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        // Priced ledger entries of direct warehouse sales (no marketplace): SALE
        // rows are negative quantities, undo ADJUSTMENTs positive — summing
        // -quantity × price nets out corrections. Manual stock adjustments carry
        // no unit price, so they're excluded here.
        this.prisma.stockMovement.findMany({
          where: {
            brandId,
            marketplaceId: null,
            unitPrice: { not: null },
            type: { in: [STOCK_MOVEMENT_TYPES.SALE, STOCK_MOVEMENT_TYPES.ADJUSTMENT] },
            ...(collectionId ? { article: { collectionId } } : {}),
          },
          select: { articleId: true, quantity: true, unitPrice: true },
        }),
      ]);

    const warehouseRevenueByArticle = new Map<string, number>();
    for (const m of warehouseSaleMovements) {
      warehouseRevenueByArticle.set(
        m.articleId,
        (warehouseRevenueByArticle.get(m.articleId) ?? 0) + -m.quantity * Number(m.unitPrice),
      );
    }

    const byMarketplace = new Map<string, MarketplaceAnalytics>(
      marketplaces.map((m) => [
        m.id,
        {
          marketplaceId: m.id,
          marketplaceName: m.name,
          marketplaceColor: m.color,
          articleCount: 0,
          allocatedUnits: 0,
          allocatedValue: 0,
          soldUnits: 0,
          revenue: 0,
        },
      ]),
    );

    const bySize = new Map<Size, SizeAnalytics>(
      SIZES.map((size) => [size, { size, warehouseUnits: 0, allocatedUnits: 0, soldUnits: 0 }]),
    );

    const rows: ArticleAnalyticsRow[] = [];

    for (const article of articles) {
      const purchasePrice = Number(article.purchasePrice);
      // Total on-hand units per size (warehouse + allocated) for low-stock detection,
      // matching the per-size rule used by the inventory low-stock endpoint.
      const perSizeTotals = new Map<Size, number>();

      let warehouseUnits = 0;
      let warehouseSoldUnits = 0;
      for (const s of article.sizes) {
        warehouseUnits += s.warehouseQuantity;
        warehouseSoldUnits += s.soldQuantity;
        perSizeTotals.set(s.size, (perSizeTotals.get(s.size) ?? 0) + s.warehouseQuantity);
        const sizeAgg = bySize.get(s.size);
        if (sizeAgg) {
          sizeAgg.warehouseUnits += s.warehouseQuantity;
          sizeAgg.soldUnits += s.soldQuantity;
        }
      }

      let allocatedUnits = 0;
      let soldUnits = 0;
      let revenue = 0;
      const articleMarketplaces: ArticleMarketplaceStock[] = [];

      for (const ma of article.marketplaceArticles) {
        const salePrice = Number(ma.salePrice);
        const agg = byMarketplace.get(ma.marketplaceId);

        let maAllocated = 0;
        let maSold = 0;
        for (const stock of ma.stocks) {
          maAllocated += stock.allocatedQuantity;
          maSold += stock.soldQuantity;
          perSizeTotals.set(
            stock.size,
            (perSizeTotals.get(stock.size) ?? 0) + stock.allocatedQuantity,
          );
          const sizeAgg = bySize.get(stock.size);
          if (sizeAgg) {
            sizeAgg.allocatedUnits += stock.allocatedQuantity;
            sizeAgg.soldUnits += stock.soldQuantity;
          }
        }

        allocatedUnits += maAllocated;
        soldUnits += maSold;
        revenue += maSold * salePrice;

        if (agg) {
          agg.articleCount += 1;
          agg.allocatedUnits += maAllocated;
          agg.allocatedValue += maAllocated * salePrice;
          agg.soldUnits += maSold;
          agg.revenue += maSold * salePrice;
        }

        if (maAllocated > 0 || maSold > 0) {
          articleMarketplaces.push({
            marketplaceId: ma.marketplaceId,
            marketplaceName: agg?.marketplaceName ?? 'Unknown',
            marketplaceColor: agg?.marketplaceColor ?? '#94a3b8',
            allocatedUnits: maAllocated,
            soldUnits: maSold,
          });
        }
      }

      const totalUnits = warehouseUnits + allocatedUnits;
      const hasLowSize = [...perSizeTotals.values()].some((t) => t > 0 && t < threshold);
      const status: ArticleStockStatus = totalUnits === 0 ? 'out' : hasLowSize ? 'low' : 'ok';
      const warehouseRevenue = warehouseRevenueByArticle.get(article.id) ?? 0;

      rows.push({
        articleId: article.id,
        code: article.code,
        name: article.name,
        imageUrl: article.imageUrl,
        collectionId: article.collection.id,
        collectionName: article.collection.name,
        purchasePrice,
        warehouseUnits,
        allocatedUnits,
        totalUnits,
        soldUnits: soldUnits + warehouseSoldUnits,
        warehouseSoldUnits,
        stockValue: round2(totalUnits * purchasePrice),
        revenue: round2(revenue + warehouseRevenue),
        status,
        marketplaces: articleMarketplaces,
      });
    }

    const marketplaceList = [...byMarketplace.values()].map((m) => ({
      ...m,
      allocatedValue: round2(m.allocatedValue),
      revenue: round2(m.revenue),
    }));

    const totals: AnalyticsTotals = {
      collections,
      articles: rows.length,
      marketplaces: marketplaces.length,
      warehouseUnits: rows.reduce((s, r) => s + r.warehouseUnits, 0),
      warehouseValue: round2(rows.reduce((s, r) => s + r.warehouseUnits * r.purchasePrice, 0)),
      allocatedUnits: rows.reduce((s, r) => s + r.allocatedUnits, 0),
      allocatedValue: round2(marketplaceList.reduce((s, m) => s + m.allocatedValue, 0)),
      totalUnits: rows.reduce((s, r) => s + r.totalUnits, 0),
      totalCostValue: round2(rows.reduce((s, r) => s + r.stockValue, 0)),
      soldUnits: rows.reduce((s, r) => s + r.soldUnits, 0),
      revenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
      warehouseSoldUnits: rows.reduce((s, r) => s + r.warehouseSoldUnits, 0),
      warehouseRevenue: round2(
        rows.reduce((s, r) => s + (warehouseRevenueByArticle.get(r.articleId) ?? 0), 0),
      ),
      lowStockArticles: rows.filter((r) => r.status === 'low').length,
      outOfStockArticles: rows.filter((r) => r.status === 'out').length,
    };

    return {
      totals,
      byMarketplace: marketplaceList,
      bySize: [...bySize.values()],
      articles: rows,
      lowStockThreshold: threshold,
    };
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
