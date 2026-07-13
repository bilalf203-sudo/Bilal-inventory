'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, FolderOpen, SearchX, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@bilal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { CollectionCardsSkeleton } from '@/components/common/skeletons';
import { Can } from '@/components/common/Can';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterSelect } from '@/components/common/FilterSelect';
import { CollectionFormDialog } from '@/features/collections/CollectionFormDialog';
import { ImportWarehouseDialog } from '@/features/import/ImportWarehouseDialog';
import {
  useClearCollections,
  useCollections,
  useDeleteCollection,
} from '@/features/collections/api';
import { usePrefetchArticlesByCollection } from '@/features/articles/api';
import { COLLECTION_SORT_OPTIONS } from '@/lib/filter-options';

export default function WarehousePage() {
  const { data, isLoading } = useCollections();
  const deleteCollection = useDeleteCollection();
  const clearCollections = useClearCollections();
  const prefetchArticles = usePrefetchArticlesByCollection();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');

  const visible = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false),
        )
      : list;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'count-desc':
          return (b.articleCount ?? 0) - (a.articleCount ?? 0);
        case 'count-asc':
          return (a.articleCount ?? 0) - (b.articleCount ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [data, search, sort]);

  const hasCollections = !!data && data.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Warehouse</h1>
          <p className="text-sm text-muted-foreground">All collections and their articles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Can permission={PERMISSIONS.ARTICLE_CREATE}>
            <ImportWarehouseDialog />
          </Can>
          {hasCollections && (
            <Can permission={PERMISSIONS.COLLECTION_DELETE}>
              <ConfirmDialog
                title="Clear all collections?"
                description={`This permanently deletes all ${data?.length ?? 0} collections, every article in them, their sizes and marketplace assignments. This cannot be undone.`}
                confirmLabel="Delete everything"
                onConfirm={() => clearCollections.mutateAsync()}
                trigger={
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Clear all
                  </Button>
                }
              />
            </Can>
          )}
          <Can permission={PERMISSIONS.COLLECTION_CREATE}>
            <CollectionFormDialog />
          </Can>
        </div>
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
              {visible.length} of {data.length}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <CollectionCardsSkeleton />
      ) : !hasCollections ? (
        <EmptyState
          icon={FolderOpen}
          title="No collections yet"
          description="Start by creating your first collection of articles."
          action={
            <Can permission={PERMISSIONS.COLLECTION_CREATE}>
              <CollectionFormDialog />
            </Can>
          }
        />
      ) : visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <div key={c.id} className="group relative">
              <Link
                href={`/warehouse/collections/${c.id}`}
                onMouseEnter={() => prefetchArticles(c.id)}
                onFocus={() => prefetchArticles(c.id)}
                onTouchStart={() => prefetchArticles(c.id)}
              >
                <Card className="transition hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription>{c.articleCount ?? 0} articles</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {c.description && (
                    <CardContent>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    </CardContent>
                  )}
                </Card>
              </Link>
              <Can permission={PERMISSIONS.COLLECTION_DELETE}>
                <div className="absolute right-2 top-2 transition lg:opacity-0 lg:group-hover:opacity-100">
                  <ConfirmDialog
                    title={`Delete "${c.name}"?`}
                    description={`This permanently deletes the collection and its ${c.articleCount ?? 0} articles, along with their sizes and marketplace assignments.`}
                    confirmLabel="Delete"
                    onConfirm={() => deleteCollection.mutateAsync(c.id)}
                    trigger={
                      <Button size="icon" variant="destructive" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </Can>
            </div>
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
