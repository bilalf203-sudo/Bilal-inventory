'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, History, Loader2, Trash2 } from 'lucide-react';
import { PERMISSIONS, SIZES } from '@bilal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ArticleDetailSkeleton } from '@/components/common/skeletons';
import { ProductImage } from '@/components/common/ProductImage';
import { ArticleFormDialog } from '@/features/articles/ArticleFormDialog';
import { AssignToMarketplaceDialog } from '@/features/inventory/AssignToMarketplaceDialog';
import { WarehouseSaleDialog } from '@/features/inventory/WarehouseSaleDialog';
import { UndoWarehouseSaleDialog } from '@/features/inventory/UndoWarehouseSaleDialog';
import {
  useArticle,
  useArticleMovements,
  useArticleStock,
  useDeleteArticle,
  type StockMovementEntry,
} from '@/features/articles/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const article = useArticle(id);
  const stock = useArticleStock(id);
  const movements = useArticleMovements(id);
  const deleteArticle = useDeleteArticle();

  if (article.isLoading) {
    return <ArticleDetailSkeleton />;
  }
  if (!article.data) return null;
  const a = article.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/warehouse/collections/${a.collectionId}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{a.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{a.code}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Can permission={PERMISSIONS.MARKETPLACE_ASSIGN_ARTICLE}>
            <AssignToMarketplaceDialog
              article={a}
              existingAssignments={stock.data?.byMarketplace.map((m) => ({
                marketplaceId: m.marketplaceId,
                salePrice: m.salePrice,
              }))}
            />
          </Can>
          <Can permission={PERMISSIONS.SALE_RECORD}>
            <WarehouseSaleDialog article={a} />
          </Can>
          <Can permission={PERMISSIONS.SALE_RECORD}>
            <UndoWarehouseSaleDialog article={a} />
          </Can>
          <Can permission={PERMISSIONS.ARTICLE_UPDATE}>
            <ArticleFormDialog
              collectionId={a.collectionId}
              article={a}
              trigger={<Button variant="outline">Edit</Button>}
            />
          </Can>
          <Can permission={PERMISSIONS.ARTICLE_DELETE}>
            <ConfirmDialog
              title={`Delete "${a.name}"?`}
              description={`This permanently deletes the article "${a.name}" (${a.code}), its sizes and any marketplace assignments.`}
              confirmLabel="Delete article"
              onConfirm={async () => {
                await deleteArticle.mutateAsync(a.id);
                router.push(`/warehouse/collections/${a.collectionId}`);
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="relative aspect-square bg-muted">
            <ProductImage src={a.imageUrl} alt={a.name} iconClassName="h-16 w-16" />
          </div>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchase price</span>
              <span className="font-semibold">{formatCurrency(a.purchasePrice)}</span>
            </div>
            {a.description && <p className="pt-2 text-muted-foreground">{a.description}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sizes &amp; SKUs</CardTitle>
            </CardHeader>
            <CardContent>
              {a.sizes.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No sizes recorded.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[20rem] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Size</th>
                        <th className="p-2 text-left font-medium">SKU</th>
                        <th className="p-2 text-right font-medium">Warehouse qty</th>
                        <th className="p-2 text-right font-medium">Sold from warehouse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.sizes.map((s) => (
                        <tr key={s.size} className="border-t">
                          <td className="p-2 font-semibold">{s.size}</td>
                          <td className="p-2 font-mono text-xs">{s.sku ?? '—'}</td>
                          <td className="p-2 text-right tabular-nums">{s.warehouseQuantity}</td>
                          <td className="p-2 text-right tabular-nums text-muted-foreground">
                            {s.soldQuantity ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total in system</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                {SIZES.map((size) => {
                  const row = stock.data?.totals.find((t) => t.size === size);
                  const total = row?.total ?? 0;
                  const low = row?.isLowStock ?? false;
                  return (
                    <div
                      key={size}
                      className={cn(
                        'rounded-lg border p-3 text-center',
                        low && 'border-destructive bg-destructive/5',
                      )}
                    >
                      <div className="text-xs font-semibold text-muted-foreground">{size}</div>
                      <div className={cn('text-xl font-bold', low && 'text-destructive')}>
                        {total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Warehouse stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                {SIZES.map((size) => {
                  const row = stock.data?.totals.find((t) => t.size === size);
                  const warehouse = row?.warehouseUnallocated ?? 0;
                  const sold = a.sizes.find((s) => s.size === size)?.soldQuantity ?? 0;
                  return (
                    <div key={size} className="rounded-lg border p-3 text-center">
                      <div className="text-xs font-semibold text-muted-foreground">{size}</div>
                      <div className="text-xl font-bold">{warehouse}</div>
                      {sold > 0 && (
                        <div className="text-[10px] text-muted-foreground">sold {sold}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Marketplace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stock.data?.byMarketplace.length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Not assigned to any marketplace yet.
                </p>
              )}
              {stock.data?.byMarketplace.map((m) => (
                <div key={m.marketplaceId} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: m.marketplaceColor }}
                      />
                      <span className="truncate font-semibold">{m.marketplaceName}</span>
                    </div>
                    <Badge variant="outline">Sale {formatCurrency(m.salePrice)}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {m.sizes.map((s) => (
                      <div
                        key={s.size}
                        className={cn(
                          'rounded-md border p-2 text-center text-xs',
                          s.isLowStock && 'border-destructive bg-destructive/5',
                        )}
                      >
                        <div className="font-semibold">{s.size}</div>
                        <div
                          className={cn('text-lg font-bold', s.isLowStock && 'text-destructive')}
                        >
                          {s.allocated}
                        </div>
                        <div className="text-[10px] text-muted-foreground">sold {s.sold}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !movements.data || movements.data.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No stock activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {movements.data.map((m) => (
                    <MovementRow key={m.id} movement={m} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const MOVEMENT_LABELS: Record<
  StockMovementEntry['type'],
  { label: string; variant: 'secondary' | 'outline' | 'success' | 'warning' }
> = {
  INITIAL_STOCK: { label: 'Initial stock', variant: 'secondary' },
  ALLOCATE_TO_MARKETPLACE: { label: 'Allocated', variant: 'outline' },
  RETURN_TO_WAREHOUSE: { label: 'Returned', variant: 'outline' },
  SALE: { label: 'Sale', variant: 'success' },
  ADJUSTMENT: { label: 'Adjustment', variant: 'warning' },
};

function MovementRow({ movement: m }: { movement: StockMovementEntry }) {
  const meta = MOVEMENT_LABELS[m.type];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-2 text-sm">
      <Badge variant={meta.variant} className="shrink-0">
        {meta.label}
      </Badge>
      <span className="font-mono text-xs font-bold">{m.size}</span>
      <span className={cn('font-semibold tabular-nums', m.quantity < 0 && 'text-destructive')}>
        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
      </span>
      {m.unitPrice != null && (
        <span className="text-xs text-muted-foreground">@ {formatCurrency(m.unitPrice)}</span>
      )}
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {m.marketplace ? (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: m.marketplace.color }}
              aria-hidden
            />
            {m.marketplace.name}
          </>
        ) : (
          'Warehouse'
        )}
      </span>
      {m.notes && <span className="min-w-0 flex-1 truncate text-xs italic">{m.notes}</span>}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {formatDate(m.createdAt)}
      </span>
    </div>
  );
}
