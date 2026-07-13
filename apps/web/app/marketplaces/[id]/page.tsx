'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, FolderOpen, SearchX, ShoppingBag } from 'lucide-react';
import { PERMISSIONS } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { EmptyState } from '@/components/common/EmptyState';
import { CollectionCardsSkeleton } from '@/components/common/skeletons';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SaleReportDialog } from '@/features/inventory/SaleReportDialog';
import {
  useMarketplace,
  useMarketplaceArticles,
  type MarketplaceArticleWithStock,
} from '@/features/marketplaces/api';
import { COLLECTION_SORT_OPTIONS } from '@/lib/filter-options';

interface CollectionSummary {
  collectionId: string;
  collectionName: string;
  articleCount: number;
}

export default function MarketplaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketplace = useMarketplace(id);
  const articles = useMarketplaceArticles(id);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');

  const collections = useMemo<CollectionSummary[]>(() => {
    if (!articles.data) return [];
    const byCollection = new Map<string, CollectionSummary>();
    for (const ma of articles.data as MarketplaceArticleWithStock[]) {
      const key = ma.article.collection.id;
      const existing = byCollection.get(key);
      if (existing) {
        existing.articleCount += 1;
      } else {
        byCollection.set(key, {
          collectionId: key,
          collectionName: ma.article.collection.name,
          articleCount: 1,
        });
      }
    }
    return Array.from(byCollection.values());
  }, [articles.data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? collections.filter((c) => c.collectionName.toLowerCase().includes(q))
      : collections;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.collectionName.localeCompare(a.collectionName);
        case 'count-desc':
          return b.articleCount - a.articleCount;
        case 'count-asc':
          return a.articleCount - b.articleCount;
        default:
          return a.collectionName.localeCompare(b.collectionName);
      }
    });
  }, [collections, search, sort]);

  const hasCollections = collections.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {marketplace.data && (
            <span
              className="h-6 w-6 shrink-0 rounded-md"
              style={{ backgroundColor: marketplace.data.color }}
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">
              {marketplace.data?.name ?? '...'}
            </h1>
            {marketplace.data?.description ? (
              <p className="text-sm text-muted-foreground">{marketplace.data.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Collections with articles assigned to this marketplace
              </p>
            )}
          </div>
        </div>
        {marketplace.data && (
          <Can permission={PERMISSIONS.SALE_RECORD}>
            <SaleReportDialog marketplaceId={id} marketplaceName={marketplace.data.name} />
          </Can>
        )}
      </div>

      {hasCollections && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search collections..."
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={sort}
              onValueChange={setSort}
              options={COLLECTION_SORT_OPTIONS}
              icon={ArrowUpDown}
              ariaLabel="Sort collections"
            />
            <span className="text-sm text-muted-foreground">
              {visible.length} of {collections.length}
            </span>
          </div>
        </div>
      )}

      {articles.isLoading ? (
        <CollectionCardsSkeleton />
      ) : !hasCollections ? (
        <EmptyState
          icon={ShoppingBag}
          title="No articles assigned to this marketplace"
          description="Open the warehouse, choose an article, and assign it to this marketplace with a sale price."
        />
      ) : visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <Link key={c.collectionId} href={`/marketplaces/${id}/collections/${c.collectionId}`}>
              <Card className="transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{c.collectionName}</CardTitle>
                      <CardDescription>
                        {c.articleCount} {c.articleCount === 1 ? 'article' : 'articles'} assigned
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No collections found"
          description="No collections match your search. Try a different term."
          action={
            <Button variant="outline" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      )}
    </div>
  );
}
