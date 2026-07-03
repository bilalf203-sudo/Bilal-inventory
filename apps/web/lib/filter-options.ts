import { DEFAULT_LOW_STOCK_THRESHOLD, SIZES } from '@bilal/shared';
import type { FilterOption } from '@/components/common/FilterSelect';

/** Sentinel value used by filter dropdowns to mean "no filter applied". */
export const ALL = 'all';

export const SIZE_FILTER_OPTIONS: FilterOption[] = [
  { value: ALL, label: 'All sizes' },
  ...SIZES.map((s) => ({ value: s, label: s })),
];

export const STOCK_FILTER_OPTIONS: FilterOption[] = [
  { value: ALL, label: 'All stock' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

export const COLLECTION_SORT_OPTIONS: FilterOption[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'count-desc', label: 'Most articles' },
  { value: 'count-asc', label: 'Fewest articles' },
];

/**
 * Shared stock-status predicate so the warehouse and marketplace article lists
 * bucket items identically. `total` is the item's total available quantity
 * (warehouse quantity in the warehouse, allocated/remaining quantity in a marketplace).
 */
export function matchesStockFilter(total: number, filter: string): boolean {
  switch (filter) {
    case 'in-stock':
      return total > 0;
    case 'low':
      return total > 0 && total < DEFAULT_LOW_STOCK_THRESHOLD;
    case 'out':
      return total === 0;
    default:
      return true;
  }
}
