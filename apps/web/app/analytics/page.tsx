'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  BarChart3,
  Boxes,
  Download,
  Filter,
  FolderOpen,
  SearchX,
  ShoppingBag,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import type {
  AnalyticsSummary,
  ArticleAnalyticsRow,
  ArticleStockStatus,
  SizeAnalytics,
} from '@bilal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { AnalyticsSkeleton } from '@/components/common/skeletons';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterSelect } from '@/components/common/FilterSelect';
import { ProductImage } from '@/components/common/ProductImage';
import { useAnalyticsSummary } from '@/features/analytics/api';
import { useCollections } from '@/features/collections/api';
import { cn, formatCurrency } from '@/lib/utils';
import { ALL } from '@/lib/filter-options';

/** Sentinel for "articles not assigned to any marketplace" in the marketplace filter. */
const UNASSIGNED = 'unassigned';

const WAREHOUSE_SEGMENT_COLOR = '#64748b';

const STATUS_FILTER_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  { value: 'ok', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const ARTICLE_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'stock-desc', label: 'Most stock' },
  { value: 'stock-asc', label: 'Least stock' },
  { value: 'value-desc', label: 'Highest value' },
  { value: 'sold-desc', label: 'Most sold' },
];

function formatUnits(n: number) {
  return new Intl.NumberFormat('en-PK').format(n);
}

export default function AnalyticsPage() {
  const [collectionFilter, setCollectionFilter] = useState(ALL);
  const { data, isLoading, isPlaceholderData } = useAnalyticsSummary(
    collectionFilter === ALL ? undefined : collectionFilter,
  );
  const collections = useCollections();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL);
  const [marketplaceFilter, setMarketplaceFilter] = useState(ALL);
  const [sort, setSort] = useState('name-asc');

  const collectionOptions = useMemo(
    () => [
      { value: ALL, label: 'All collections' },
      ...(collections.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [collections.data],
  );

  const marketplaceOptions = useMemo(
    () => [
      { value: ALL, label: 'All marketplaces' },
      ...(data?.byMarketplace ?? []).map((m) => ({
        value: m.marketplaceId,
        label: m.marketplaceName,
      })),
      { value: UNASSIGNED, label: 'Not on any marketplace' },
    ],
    [data?.byMarketplace],
  );

  const visible = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.articles.filter((a) => {
      if (status !== ALL && a.status !== status) return false;
      if (marketplaceFilter !== ALL) {
        if (marketplaceFilter === UNASSIGNED) {
          if (a.marketplaces.length > 0) return false;
        } else if (!a.marketplaces.some((m) => m.marketplaceId === marketplaceFilter)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.collectionName.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-desc':
          return b.totalUnits - a.totalUnits;
        case 'stock-asc':
          return a.totalUnits - b.totalUnits;
        case 'value-desc':
          return b.stockValue - a.stockValue;
        case 'sold-desc':
          return b.soldUnits - a.soldUnits;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [data, search, status, marketplaceFilter, sort]);

  if (isLoading || !data) {
    return <AnalyticsSkeleton />;
  }

  const { totals } = data;

  return (
    <div className={cn('space-y-6', isPlaceholderData && 'opacity-60 transition-opacity')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Stock, value and sales across the warehouse and all marketplaces
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={collectionFilter}
            onValueChange={setCollectionFilter}
            options={collectionOptions}
            icon={FolderOpen}
            ariaLabel="Filter by collection"
          />
          {totals.articles > 0 && (
            <Button variant="outline" onClick={() => exportArticlesCsv(visible)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {totals.articles === 0 ? (
        collectionFilter !== ALL ? (
          <EmptyState
            icon={BarChart3}
            title="No articles in this collection"
            description="This collection has no articles yet. Pick another one or go back to all collections."
            action={
              <Button variant="outline" onClick={() => setCollectionFilter(ALL)}>
                Show all collections
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No data to analyze yet"
            description="Add collections and articles to your warehouse to see stock and sales analytics."
          />
        )
      ) : (
        <>
          {/* KPI cards: units + value for total / warehouse / marketplaces / sold */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Boxes className="h-5 w-5 text-primary" />}
              label="Total stock"
              units={totals.totalUnits}
              value={`${formatCurrency(totals.totalCostValue)} at cost`}
            />
            <StatCard
              icon={<Warehouse className="h-5 w-5 text-primary" />}
              label="In warehouse"
              units={totals.warehouseUnits}
              value={`${formatCurrency(totals.warehouseValue)} at cost`}
            />
            <StatCard
              icon={<ShoppingBag className="h-5 w-5 text-primary" />}
              label="On marketplaces"
              units={totals.allocatedUnits}
              value={`${formatCurrency(totals.allocatedValue)} retail value`}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-primary" />}
              label="Sold"
              units={totals.soldUnits}
              value={`${formatCurrency(totals.revenue)} revenue`}
            />
          </div>

          {/* Secondary counters */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat label="Articles" value={formatUnits(totals.articles)} />
            <MiniStat label="Collections" value={formatUnits(totals.collections)} />
            <MiniStat label="Marketplaces" value={formatUnits(totals.marketplaces)} />
            <MiniStat
              label="Low stock"
              value={formatUnits(totals.lowStockArticles)}
              tone={totals.lowStockArticles > 0 ? 'warning' : undefined}
            />
            <MiniStat
              label="Out of stock"
              value={formatUnits(totals.outOfStockArticles)}
              tone={totals.outOfStockArticles > 0 ? 'destructive' : undefined}
            />
          </div>

          <StockDistributionCard data={data} />

          <MarketplaceTableCard data={data} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock by size</CardTitle>
            </CardHeader>
            <CardContent>
              <SizeBars sizes={data.bySize} />
            </CardContent>
          </Card>

          {/* All articles with stock across warehouse and marketplaces */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All articles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search articles, codes, collections..."
                  className="sm:max-w-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect
                    value={status}
                    onValueChange={setStatus}
                    options={STATUS_FILTER_OPTIONS}
                    icon={Filter}
                    ariaLabel="Filter by stock status"
                  />
                  <FilterSelect
                    value={marketplaceFilter}
                    onValueChange={setMarketplaceFilter}
                    options={marketplaceOptions}
                    icon={ShoppingBag}
                    ariaLabel="Filter by marketplace"
                  />
                  <FilterSelect
                    value={sort}
                    onValueChange={setSort}
                    options={ARTICLE_SORT_OPTIONS}
                    icon={ArrowUpDown}
                    ariaLabel="Sort articles"
                  />
                  <span className="text-sm text-muted-foreground">
                    {visible.length} of {data.articles.length}
                  </span>
                </div>
              </div>

              {visible.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No articles match"
                  description="Try a different search term or filter."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('');
                        setStatus(ALL);
                        setMarketplaceFilter(ALL);
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <ArticlesTable rows={visible} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  units,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  units: number;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tabular-nums">
            {formatUnits(units)} <span className="text-sm font-normal">units</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'warning' | 'destructive';
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            tone === 'destructive'
              ? 'text-lg font-bold text-destructive'
              : tone === 'warning'
                ? 'text-lg font-bold text-yellow-600'
                : 'text-lg font-bold'
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Where stock sits: warehouse vs each marketplace
// ---------------------------------------------------------------------------

function StockDistributionCard({ data }: { data: AnalyticsSummary }) {
  const segments = [
    {
      id: 'warehouse',
      label: 'Warehouse',
      color: WAREHOUSE_SEGMENT_COLOR,
      units: data.totals.warehouseUnits,
    },
    ...data.byMarketplace.map((m) => ({
      id: m.marketplaceId,
      label: m.marketplaceName,
      color: m.marketplaceColor,
      units: m.allocatedUnits,
    })),
  ].filter((s) => s.units > 0);

  const total = data.totals.totalUnits;
  if (total === 0 || segments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where stock sits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) => (
            <div
              key={s.id}
              className="h-full"
              style={{ width: `${(s.units / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${formatUnits(s.units)} units`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums">
                {formatUnits(s.units)} ({Math.round((s.units / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Per-marketplace units and values
// ---------------------------------------------------------------------------

function MarketplaceTableCard({ data }: { data: AnalyticsSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">By marketplace</CardTitle>
      </CardHeader>
      <CardContent>
        {data.byMarketplace.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No marketplaces yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-semibold">Marketplace</th>
                  <th className="px-2 py-2 text-right font-semibold">Articles</th>
                  <th className="px-2 py-2 text-right font-semibold">Units in stock</th>
                  <th className="px-2 py-2 text-right font-semibold">Stock value</th>
                  <th className="px-2 py-2 text-right font-semibold">Sold</th>
                  <th className="px-2 py-2 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.byMarketplace.map((m) => (
                  <tr key={m.marketplaceId} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/marketplaces/${m.marketplaceId}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: m.marketplaceColor }}
                          aria-hidden
                        />
                        {m.marketplaceName}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatUnits(m.articleCount)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatUnits(m.allocatedUnits)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(m.allocatedValue)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatUnits(m.soldUnits)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatUnits(data.byMarketplace.reduce((s, m) => s + m.articleCount, 0))}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatUnits(data.totals.allocatedUnits)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCurrency(data.totals.allocatedValue)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatUnits(data.totals.soldUnits)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCurrency(data.totals.revenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stock by size
// ---------------------------------------------------------------------------

function SizeBars({ sizes }: { sizes: SizeAnalytics[] }) {
  const max = Math.max(...sizes.map((s) => s.warehouseUnits + s.allocatedUnits), 1);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" aria-hidden /> Warehouse
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" aria-hidden /> On marketplaces
        </span>
      </div>
      <div className="space-y-3">
        {sizes.map((s) => {
          const total = s.warehouseUnits + s.allocatedUnits;
          return (
            <div key={s.size} className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
              <span className="w-9 shrink-0 font-mono text-xs font-bold">{s.size}</span>
              <div className="h-3 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-muted">
                <div className="flex h-full" style={{ width: `${(total / max) * 100}%` }}>
                  {s.warehouseUnits > 0 && (
                    <div
                      className="h-full bg-slate-400"
                      style={{ width: `${(s.warehouseUnits / total) * 100}%` }}
                    />
                  )}
                  {s.allocatedUnits > 0 && (
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(s.allocatedUnits / total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums sm:w-64 sm:text-right">
                {formatUnits(total)} in stock · {formatUnits(s.warehouseUnits)} warehouse ·{' '}
                {formatUnits(s.allocatedUnits)} marketplace · {formatUnits(s.soldUnits)} sold
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Articles table
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<
  ArticleStockStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  ok: { label: 'In stock', variant: 'success' },
  low: { label: 'Low stock', variant: 'warning' },
  out: { label: 'Out of stock', variant: 'destructive' },
};

function ArticlesTable({ rows }: { rows: ArticleAnalyticsRow[] }) {
  const sum = (fn: (r: ArticleAnalyticsRow) => number) => rows.reduce((s, r) => s + fn(r), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2 font-semibold">Article</th>
            <th className="px-2 py-2 font-semibold">Collection</th>
            <th className="px-2 py-2 text-right font-semibold">Warehouse</th>
            <th className="px-2 py-2 font-semibold">On marketplaces</th>
            <th className="px-2 py-2 text-right font-semibold">Sold</th>
            <th className="px-2 py-2 text-right font-semibold">Total</th>
            <th className="px-2 py-2 text-right font-semibold">Stock value</th>
            <th className="px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <tr key={r.articleId} className="border-b last:border-0 hover:bg-accent/50">
                <td className="px-2 py-2">
                  <Link
                    href={`/warehouse/articles/${r.articleId}`}
                    className="flex items-center gap-3"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border">
                      <ProductImage src={r.imageUrl} alt={r.name} iconClassName="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="max-w-[16rem] truncate font-medium hover:underline">
                        {r.name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    </div>
                  </Link>
                </td>
                <td className="max-w-[10rem] truncate px-2 py-2 text-muted-foreground">
                  {r.collectionName}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatUnits(r.warehouseUnits)}</td>
                <td className="px-2 py-2">
                  {r.marketplaces.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex max-w-[16rem] flex-wrap gap-1">
                      {r.marketplaces.map((m) => (
                        <span
                          key={m.marketplaceId}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums"
                          title={`${m.marketplaceName}: ${formatUnits(m.allocatedUnits)} in stock, ${formatUnits(m.soldUnits)} sold`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: m.marketplaceColor }}
                            aria-hidden
                          />
                          {formatUnits(m.allocatedUnits)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatUnits(r.soldUnits)}</td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">
                  {formatUnits(r.totalUnits)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(r.stockValue)}</td>
                <td className="px-2 py-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-xs font-semibold">
            <td className="px-2 py-2">Total ({rows.length})</td>
            <td className="px-2 py-2" />
            <td className="px-2 py-2 text-right tabular-nums">
              {formatUnits(sum((r) => r.warehouseUnits))}
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              {formatUnits(sum((r) => r.allocatedUnits))}
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              {formatUnits(sum((r) => r.soldUnits))}
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              {formatUnits(sum((r) => r.totalUnits))}
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              {formatCurrency(sum((r) => r.stockValue))}
            </td>
            <td className="px-2 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export of the (filtered) articles table
// ---------------------------------------------------------------------------

function exportArticlesCsv(rows: ArticleAnalyticsRow[]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    'Code',
    'Article',
    'Collection',
    'Warehouse units',
    'Marketplace units',
    'Total units',
    'Sold units',
    'Purchase price',
    'Stock value',
    'Revenue',
    'Status',
  ];
  const lines = [
    header,
    ...rows.map((r) => [
      r.code,
      r.name,
      r.collectionName,
      r.warehouseUnits,
      r.allocatedUnits,
      r.totalUnits,
      r.soldUnits,
      r.purchasePrice,
      r.stockValue,
      r.revenue,
      STATUS_BADGE[r.status].label,
    ]),
  ];
  const csv = lines.map((l) => l.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory-analytics.csv';
  a.click();
  URL.revokeObjectURL(url);
}
