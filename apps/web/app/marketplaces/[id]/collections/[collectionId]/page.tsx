'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Boxes,
  ChevronLeft,
  Loader2,
  Ruler,
  SearchX,
  ShoppingBag,
} from 'lucide-react';
import { PERMISSIONS, SIZES, type Size } from '@bilal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterSelect, type FilterOption } from '@/components/common/FilterSelect';
import { ProductImage } from '@/components/common/ProductImage';
import { RecordSaleDialog } from '@/features/inventory/RecordSaleDialog';
import {
  useMarketplace,
  useMarketplaceArticles,
  type MarketplaceArticleWithStock,
} from '@/features/marketplaces/api';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ALL,
  matchesStockFilter,
  SIZE_FILTER_OPTIONS,
  STOCK_FILTER_OPTIONS,
} from '@/lib/filter-options';

const LOW_STOCK_THRESHOLD = 10;

const SORT_OPTIONS: FilterOption[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'stock-desc', label: 'Stock (high–low)' },
  { value: 'stock-asc', label: 'Stock (low–high)' },
  { value: 'price-asc', label: 'Price (low–high)' },
  { value: 'price-desc', label: 'Price (high–low)' },
];

const totalRemaining = (ma: MarketplaceArticleWithStock) =>
  ma.stocks.reduce((sum, s) => sum + s.allocatedQuantity, 0);

export default function MarketplaceCollectionPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id, collectionId } = use(params);
  const marketplace = useMarketplace(id);
  const articles = useMarketplaceArticles(id);

  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState(ALL);
  const [stockFilter, setStockFilter] = useState(ALL);
  const [sort, setSort] = useState('name-asc');

  const inCollection = useMemo(
    () => (articles.data ?? []).filter((ma) => ma.article.collection.id === collectionId),
    [articles.data, collectionId],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = inCollection.filter((ma) => {
      if (
        q &&
        !ma.article.name.toLowerCase().includes(q) &&
        !ma.article.code.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (sizeFilter !== ALL) {
        const qty = ma.stocks
          .filter((s) => s.size === sizeFilter)
          .reduce((sum, s) => sum + s.allocatedQuantity, 0);
        if (qty <= 0) return false;
      }
      if (!matchesStockFilter(totalRemaining(ma), stockFilter)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.article.name.localeCompare(a.article.name);
        case 'price-asc':
          return Number(a.salePrice) - Number(b.salePrice);
        case 'price-desc':
          return Number(b.salePrice) - Number(a.salePrice);
        case 'stock-desc':
          return totalRemaining(b) - totalRemaining(a);
        case 'stock-asc':
          return totalRemaining(a) - totalRemaining(b);
        default:
          return a.article.name.localeCompare(b.article.name);
      }
    });
  }, [inCollection, search, sizeFilter, stockFilter, sort]);

  const collectionName = inCollection[0]?.article.collection.name ?? 'Collection';
  const total = inCollection.length;
  const hasArticles = total > 0;
  const filtersActive = search.trim() !== '' || sizeFilter !== ALL || stockFilter !== ALL;

  const clearFilters = () => {
    setSearch('');
    setSizeFilter(ALL);
    setStockFilter(ALL);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/marketplaces/${id}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {marketplace.data && (
            <span
              className="h-6 w-6 rounded-md"
              style={{ backgroundColor: marketplace.data.color }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{collectionName}</h1>
            <p className="text-sm text-muted-foreground">
              Assigned in {marketplace.data?.name ?? '...'}
            </p>
          </div>
        </div>
      </div>

      {hasArticles && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or code..."
              className="lg:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={sizeFilter}
                onValueChange={setSizeFilter}
                options={SIZE_FILTER_OPTIONS}
                icon={Ruler}
                ariaLabel="Filter by size"
              />
              <FilterSelect
                value={stockFilter}
                onValueChange={setStockFilter}
                options={STOCK_FILTER_OPTIONS}
                icon={Boxes}
                ariaLabel="Filter by stock"
              />
              <FilterSelect
                value={sort}
                onValueChange={setSort}
                options={SORT_OPTIONS}
                icon={ArrowUpDown}
                ariaLabel="Sort articles"
              />
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          {filtersActive && (
            <p className="text-sm text-muted-foreground">
              {visible.length} of {total} articles
            </p>
          )}
        </div>
      )}

      {articles.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasArticles ? (
        <EmptyState
          icon={ShoppingBag}
          title="No articles from this collection"
          description="Nothing from this collection is assigned to this marketplace."
        />
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((ma) => {
            const stockBySize = new Map<Size, { allocated: number; sold: number }>();
            ma.stocks.forEach((s) =>
              stockBySize.set(s.size as Size, {
                allocated: s.allocatedQuantity,
                sold: s.soldQuantity,
              }),
            );
            const sizesForSale = SIZES.map((size) => ({
              size,
              allocated: stockBySize.get(size)?.allocated ?? 0,
            }));

            return (
              <Card key={ma.id}>
                <CardContent className="flex items-center gap-6 p-4">
                  <Link
                    href={`/warehouse/articles/${ma.articleId}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    <ProductImage
                      src={ma.article.imageUrl}
                      alt={ma.article.name}
                      iconClassName="h-8 w-8"
                    />
                  </Link>

                  <div className="flex-1 space-y-2">
                    <div>
                      <Link
                        href={`/warehouse/articles/${ma.articleId}`}
                        className="font-semibold hover:underline"
                      >
                        {ma.article.name}
                      </Link>
                      <div className="text-xs font-mono text-muted-foreground">
                        {ma.article.code}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {SIZES.map((size) => {
                        const s = stockBySize.get(size);
                        const remaining = s?.allocated ?? 0;
                        const sold = s?.sold ?? 0;
                        const low = remaining > 0 && remaining < LOW_STOCK_THRESHOLD;
                        return (
                          <Badge
                            key={size}
                            variant={
                              remaining === 0 ? 'secondary' : low ? 'destructive' : 'outline'
                            }
                            className={cn('font-mono tabular-nums gap-1')}
                          >
                            <span className="font-bold">{size}</span>
                            <span>·</span>
                            <span>{remaining}</span>
                            {sold > 0 && (
                              <span className="text-[10px] opacity-70">/{sold}sold</span>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(ma.salePrice)}</div>
                    <div className="text-xs text-muted-foreground">
                      Cost {formatCurrency(ma.article.purchasePrice)}
                    </div>
                  </div>

                  <Can permission={PERMISSIONS.SALE_RECORD}>
                    <RecordSaleDialog
                      marketplaceArticleId={ma.id}
                      articleName={ma.article.name}
                      availableSizes={sizesForSale}
                    />
                  </Can>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No articles found"
          description="No articles match your current search and filters."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
