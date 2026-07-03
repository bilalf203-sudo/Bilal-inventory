import {
  normalizeImageUrl,
  normalizeSize,
  parseQuantity,
  type ImportRow,
  type SalesReportRow,
} from '@bilal/shared';

export interface SkippedRow {
  line: number;
  reason: string;
  raw: string;
}

/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes ("")
 * and CRLF. Returns a grid of raw (untrimmed) cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\n') {
      endRow();
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

/** True when a row is the export header (`Column1, Column2, …` or `Product Title …`). */
function isHeaderRow(cells: string[]): boolean {
  const first = (cells[0] ?? '').toLowerCase();
  return /^column\s*1$/.test(first) || first === 'product title';
}

interface MappedRow {
  articleName: string;
  collectionName: string;
  sku: string;
  sizeRaw: string;
  qtyRaw: string;
  imageRaw: string;
}

/** Walks the grid, dropping blank/header rows, yielding trimmed columns. */
function* iterRows(grid: string[][]): Generator<{ line: number; raw: string; cols: MappedRow }> {
  for (let i = 0; i < grid.length; i += 1) {
    const cells = grid[i].map((c) => c.trim());
    if (cells.every((c) => c === '')) continue;
    if (isHeaderRow(cells)) continue;
    const [articleName = '', collectionName = '', sku = '', sizeRaw = '', qtyRaw = ''] = cells;
    // Match the image by content (any http(s) cell), not a fixed column — the CDN
    // link can sit in a different position from row to row across exports.
    const imageRaw = cells.find((c) => /^https?:\/\//i.test(c)) ?? '';
    yield {
      line: i + 1,
      raw: grid[i].join(','),
      cols: { articleName, collectionName, sku, sizeRaw, qtyRaw, imageRaw },
    };
  }
}

export interface WarehouseCsvResult {
  rows: ImportRow[];
  skipped: SkippedRow[];
}

/**
 * Maps the factory stock CSV (one row per size) to import rows.
 * Columns: 1=article, 2=collection, 3=SKU, 4=size, 5=quantity, 6=image URL.
 */
export function mapWarehouseCsv(grid: string[][]): WarehouseCsvResult {
  const rows: ImportRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const { line, raw, cols } of iterRows(grid)) {
    if (!cols.articleName || !cols.sku) {
      skipped.push({ line, reason: 'Missing article name or SKU', raw });
      continue;
    }
    const size = normalizeSize(cols.sizeRaw);
    if (!size) {
      skipped.push({ line, reason: `Unrecognized size "${cols.sizeRaw}"`, raw });
      continue;
    }
    rows.push({
      // Some real products ship without a collection in the export — keep them.
      collectionName: cols.collectionName || 'Uncategorized',
      articleName: cols.articleName,
      sku: cols.sku,
      size,
      quantity: parseQuantity(cols.qtyRaw),
      imageUrl: normalizeImageUrl(cols.imageRaw),
    });
  }

  return { rows, skipped };
}

export interface SaleReportCsvResult {
  rows: SalesReportRow[];
  skipped: SkippedRow[];
}

/**
 * Maps a daily sale report (same shape as the stock CSV) to report rows. Here
 * column 5 is the *remaining* stock now; rows without a real number are skipped
 * (a blank/"-" must not be read as "zero left, everything sold").
 */
export function mapSaleReportCsv(grid: string[][]): SaleReportCsvResult {
  const rows: SalesReportRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const { line, raw, cols } of iterRows(grid)) {
    if (!cols.sku) {
      skipped.push({ line, reason: 'Missing SKU', raw });
      continue;
    }
    const size = normalizeSize(cols.sizeRaw);
    if (!size) {
      skipped.push({ line, reason: `Unrecognized size "${cols.sizeRaw}"`, raw });
      continue;
    }
    const q = cols.qtyRaw.trim();
    if (q === '' || q === '-') {
      skipped.push({ line, reason: 'No remaining quantity', raw });
      continue;
    }
    const n = Number(q.replace(/[,\s]/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      skipped.push({ line, reason: `Invalid quantity "${cols.qtyRaw}"`, raw });
      continue;
    }
    rows.push({ sku: cols.sku, size, quantity: Math.floor(n) });
  }

  return { rows, skipped };
}

/** Reads a File to text. */
export function readFileText(file: File): Promise<string> {
  return file.text();
}
