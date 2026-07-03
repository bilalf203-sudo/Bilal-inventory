export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
