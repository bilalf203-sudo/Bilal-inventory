import { SIZES, type Size } from '../constants/sizes.js';

/**
 * Helpers for the factory-stock CSV import. Shared between the web app (which
 * parses the file and shows a preview) and the API (which persists), so the
 * grouping is guaranteed identical on both sides.
 *
 * CSV shape (Buraq factory export), one row per size:
 *   Column1 = article display name   e.g. "Aftab", "Aqua Green Collared"
 *   Column2 = collection name         e.g. "zarif", "alif-1"
 *   Column3 = per-size SKU            e.g. "BUR-AFTAB-M", "BUR-B0-M-7"
 *   Column4 = size                    e.g. "M", "XL"
 *   Column5 = quantity (units)        e.g. "-" (blank) or a number
 *   Column6 = image URL (CDN link)    may be empty
 */

/** A single CSV row after column mapping, before grouping. */
export interface ParsedImportRow {
  collectionName: string;
  articleName: string;
  sku: string;
  size: Size;
  quantity: number;
  imageUrl: string | null;
}

export interface GroupedArticleSize {
  size: Size;
  sku: string;
  quantity: number;
}

export interface GroupedArticle {
  /** SKU stem (size token removed) — the real per-article identity. */
  code: string;
  name: string;
  imageUrl: string | null;
  sizes: GroupedArticleSize[];
}

export interface GroupedCollection {
  name: string;
  articles: GroupedArticle[];
}

/** Returns the canonical Size for a raw cell value, or null if not a real size. */
export function normalizeSize(raw: string | null | undefined): Size | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return (SIZES as readonly string[]).includes(v) ? (v as Size) : null;
}

/** Parses a quantity cell. Blank, "-" or non-numeric ⇒ 0. */
export function parseQuantity(raw: string | null | undefined): number {
  if (raw == null) return 0;
  const v = String(raw).trim();
  if (v === '' || v === '-') return 0;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Normalizes an image cell to an http(s) URL or null. */
export function normalizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

const CODE_SAFE = /[^A-Za-z0-9_-]+/g;

/**
 * Derives the per-article SKU stem by removing the size segment from a per-size
 * SKU. The size can sit anywhere in the dash-delimited SKU:
 *   ("BUR-AFTAB-M", "M")   -> "BUR-AFTAB"
 *   ("BUR-B0-M-7", "M")    -> "BUR-B0-7"
 *   ("BUR-BS-L-1", "L")    -> "BUR-BS-1"
 * Two products that share a display name in one collection (e.g. "Blue Stripper"
 * as BUR-BS and BUR-BS-…-1) thus resolve to distinct articles.
 */
export function deriveSkuStem(sku: string, size: Size): string {
  const raw = (sku ?? '').trim();
  const parts = raw.split('-');
  const sizeUpper = size.toUpperCase();
  const idx = parts.findIndex((p) => p.trim().toUpperCase() === sizeUpper);
  const stem = (idx === -1 ? parts : [...parts.slice(0, idx), ...parts.slice(idx + 1)])
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safe = stem.replace(CODE_SAFE, '');
  if (safe) return safe;
  // Fallbacks: the raw SKU, else a slug of nothing → a stable placeholder.
  return raw.replace(CODE_SAFE, '') || 'ITEM';
}

/**
 * Groups flat CSV rows into collections → articles → sizes.
 * - Collections key on trimmed, case-insensitive name (first spelling wins).
 * - Articles key on (collection, SKU stem); display name is the first seen.
 * - Within an article, the first row for a given size wins; later duplicates are
 *   returned separately so the caller can surface them.
 */
export function groupImportRows(rows: ParsedImportRow[]): {
  collections: GroupedCollection[];
  duplicateSizes: ParsedImportRow[];
} {
  const collections = new Map<string, { name: string; articles: Map<string, GroupedArticle> }>();
  const duplicateSizes: ParsedImportRow[] = [];

  for (const row of rows) {
    const collName = row.collectionName.trim();
    const collKey = collName.toLowerCase();
    let coll = collections.get(collKey);
    if (!coll) {
      coll = { name: collName, articles: new Map() };
      collections.set(collKey, coll);
    }

    const code = deriveSkuStem(row.sku, row.size);
    let article = coll.articles.get(code);
    if (!article) {
      article = { code, name: row.articleName.trim(), imageUrl: row.imageUrl, sizes: [] };
      coll.articles.set(code, article);
    }
    if (!article.imageUrl && row.imageUrl) article.imageUrl = row.imageUrl;

    if (article.sizes.some((s) => s.size === row.size)) {
      duplicateSizes.push(row);
      continue;
    }
    article.sizes.push({ size: row.size, sku: row.sku.trim(), quantity: row.quantity });
  }

  return {
    collections: Array.from(collections.values()).map((c) => ({
      name: c.name,
      articles: Array.from(c.articles.values()),
    })),
    duplicateSizes,
  };
}
