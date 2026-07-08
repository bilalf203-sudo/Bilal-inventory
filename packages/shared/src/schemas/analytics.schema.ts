import type { Size } from '../constants/sizes.js';

// ---------------------------------------------------------------------------
// Analytics summary: one payload with brand-wide stock counts and values,
// broken down by warehouse, marketplace, size and article.
//
// Valuation conventions:
//  - warehouse stock is valued at purchase price (cost)
//  - marketplace stock is valued at that marketplace's sale price (retail)
//  - revenue is sold units × the current sale price of the allocation
// ---------------------------------------------------------------------------

export interface AnalyticsTotals {
  collections: number;
  articles: number;
  marketplaces: number;
  /** Unallocated units sitting in the warehouse. */
  warehouseUnits: number;
  /** Warehouse units × purchase price. */
  warehouseValue: number;
  /** Units currently allocated across all marketplaces. */
  allocatedUnits: number;
  /** Allocated units × sale price (retail value on marketplaces). */
  allocatedValue: number;
  /** warehouseUnits + allocatedUnits. */
  totalUnits: number;
  /** All stock on hand (warehouse + allocated) × purchase price. */
  totalCostValue: number;
  /** Total sold: marketplace sales + direct warehouse sales. */
  soldUnits: number;
  /** Total revenue: marketplace sales + direct warehouse sales. */
  revenue: number;
  /** Units sold directly from the warehouse (subset of soldUnits). */
  warehouseSoldUnits: number;
  /** Revenue from direct warehouse sales (subset of revenue). */
  warehouseRevenue: number;
  lowStockArticles: number;
  outOfStockArticles: number;
}

export interface MarketplaceAnalytics {
  marketplaceId: string;
  marketplaceName: string;
  marketplaceColor: string;
  /** Number of articles assigned to this marketplace. */
  articleCount: number;
  allocatedUnits: number;
  /** Allocated units × sale price. */
  allocatedValue: number;
  soldUnits: number;
  /** Sold units × sale price. */
  revenue: number;
}

export interface SizeAnalytics {
  size: Size;
  warehouseUnits: number;
  allocatedUnits: number;
  soldUnits: number;
}

export type ArticleStockStatus = 'ok' | 'low' | 'out';

/** Per-marketplace slice of one article's stock, for chips/breakdowns. */
export interface ArticleMarketplaceStock {
  marketplaceId: string;
  marketplaceName: string;
  marketplaceColor: string;
  allocatedUnits: number;
  soldUnits: number;
}

export interface ArticleAnalyticsRow {
  articleId: string;
  code: string;
  name: string;
  imageUrl: string | null;
  collectionId: string;
  collectionName: string;
  purchasePrice: number;
  warehouseUnits: number;
  allocatedUnits: number;
  /** warehouseUnits + allocatedUnits. */
  totalUnits: number;
  /** Total sold: marketplace sales + direct warehouse sales. */
  soldUnits: number;
  /** Units sold directly from the warehouse (subset of soldUnits). */
  warehouseSoldUnits: number;
  /** totalUnits × purchase price (stock on hand, at cost). */
  stockValue: number;
  /** Marketplace sales at sale price + direct warehouse sales at recorded price. */
  revenue: number;
  status: ArticleStockStatus;
  marketplaces: ArticleMarketplaceStock[];
}

export interface AnalyticsSummary {
  totals: AnalyticsTotals;
  byMarketplace: MarketplaceAnalytics[];
  bySize: SizeAnalytics[];
  articles: ArticleAnalyticsRow[];
  lowStockThreshold: number;
}
