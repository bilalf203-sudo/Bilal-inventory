'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Boxes, ChevronLeft, Loader2, Package, Ruler, SearchX, Trash2 } from 'lucide-react';
import { PERMISSIONS, SIZES, type Article } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { StockBadge } from '@/components/common/StockBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterSelect, type FilterOption } from '@/components/common/FilterSelect';
import { ProductImage } from '@/components/common/ProductImage';
import { ArticleFormDialog } from '@/features/articles/ArticleFormDialog';
import { useArticlesByCollection, useDeleteArticle } from '@/features/articles/api';
import { useCollection, useDeleteCollection } from '@/features/collections/api';
import { formatCurrency } from '@/lib/utils';
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
  { value: 'price-asc', label: 'Cost (low–high)' },
  { value: 'price-desc', label: 'Cost (high–low)' },
];

const totalStock = (a: Article) => a.sizes.reduce((sum, s) => sum + s.warehouseQuantity, 0);

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const collection = useCollection(id);
  const articles = useArticlesByCollection(id);
  const deleteArticle = useDeleteArticle();
  const deleteCollection = useDeleteCollection();

  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState(ALL);
  const [stockFilter, setStockFilter] = useState(ALL);
  const [sort, setSort] = useState('name-asc');

  const visible = useMemo(() => {
    const list = articles.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = list.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q)) {
        return false;
      }
      if (sizeFilter !== ALL) {
        const qty = a.sizes.find((s) => s.size === sizeFilter)?.warehouseQuantity ?? 0;
        if (qty <= 0) return false;
      }
      if (!matchesStockFilter(totalStock(a), stockFilter)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.purchasePrice - b.purchasePrice;
        case 'price-desc':
          return b.purchasePrice - a.purchasePrice;
        case 'stock-desc':
          return totalStock(b) - totalStock(a);
        case 'stock-asc':
          return totalStock(a) - totalStock(b);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [articles.data, search, sizeFilter, stockFilter, sort]);

  const total = articles.data?.length ?? 0;
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
          <Link href="/warehouse">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{collection.data?.name ?? '...'}</h1>
          {collection.data?.description && (
            <p className="text-sm text-muted-foreground">{collection.data.description}</p>
          )}
        </div>
        <Can permission={PERMISSIONS.ARTICLE_CREATE}>
          <ArticleFormDialog collectionId={id} />
        </Can>
        <Can permission={PERMISSIONS.COLLECTION_DELETE}>
          <ConfirmDialog
            title={`Delete "${collection.data?.name ?? 'collection'}"?`}
            description={`This permanently deletes the collection and its ${total} articles, along with their sizes and marketplace assignments.`}
            confirmLabel="Delete collection"
            onConfirm={async () => {
              await deleteCollection.mutateAsync(id);
              router.push('/warehouse');
            }}
            trigger={
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            }
          />
        </Can>
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
          icon={Package}
          title="No articles in this collection"
          description="Add your first article with image, sizes and cost."
          action={
            <Can permission={PERMISSIONS.ARTICLE_CREATE}>
              <ArticleFormDialog collectionId={id} />
            </Can>
          }
        />
      ) : visible.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <div key={a.id} className="group relative">
              <Can permission={PERMISSIONS.ARTICLE_DELETE}>
                <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
                  <ConfirmDialog
                    title={`Delete "${a.name}"?`}
                    description={`This permanently deletes the article "${a.name}" (${a.code}), its sizes and any marketplace assignments.`}
                    confirmLabel="Delete"
                    onConfirm={() => deleteArticle.mutateAsync(a.id)}
                    trigger={
                      <Button size="icon" variant="destructive" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </Can>
              <Link href={`/warehouse/articles/${a.id}`}>
                <Card className="overflow-hidden transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-muted">
                    <ProductImage src={a.imageUrl} alt={a.name} />
                  </div>
                  <CardContent className="space-y-3 p-4">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{a.code}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SIZES.map((size) => {
                      const s = a.sizes.find((x) => x.size === size);
                      const qty = s?.warehouseQuantity ?? 0;
                      return (
                        <StockBadge
                          key={size}
                          size={size}
                          quantity={qty}
                          isLowStock={qty > 0 && qty < LOW_STOCK_THRESHOLD}
                        />
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cost: {formatCurrency(a.purchasePrice)}
                  </div>
                </CardContent>
                </Card>
              </Link>
            </div>
          ))}
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
