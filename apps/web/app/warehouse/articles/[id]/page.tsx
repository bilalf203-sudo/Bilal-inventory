'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Trash2 } from 'lucide-react';
import { PERMISSIONS, SIZES } from '@bilal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProductImage } from '@/components/common/ProductImage';
import { ArticleFormDialog } from '@/features/articles/ArticleFormDialog';
import { AssignToMarketplaceDialog } from '@/features/inventory/AssignToMarketplaceDialog';
import { useArticle, useArticleStock, useDeleteArticle } from '@/features/articles/api';
import { cn, formatCurrency } from '@/lib/utils';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const article = useArticle(id);
  const stock = useArticleStock(id);
  const deleteArticle = useDeleteArticle();

  if (article.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!article.data) return null;
  const a = article.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/warehouse/collections/${a.collectionId}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{a.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{a.code}</p>
        </div>
        <Can permission={PERMISSIONS.MARKETPLACE_ASSIGN_ARTICLE}>
          <AssignToMarketplaceDialog
            article={a}
            existingAssignments={stock.data?.byMarketplace.map((m) => ({
              marketplaceId: m.marketplaceId,
              salePrice: m.salePrice,
            }))}
          />
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
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Size</th>
                        <th className="p-2 text-left font-medium">SKU</th>
                        <th className="p-2 text-right font-medium">Warehouse qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.sizes.map((s) => (
                        <tr key={s.size} className="border-t">
                          <td className="p-2 font-semibold">{s.size}</td>
                          <td className="p-2 font-mono text-xs">{s.sku ?? '—'}</td>
                          <td className="p-2 text-right tabular-nums">{s.warehouseQuantity}</td>
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
              <div className="grid grid-cols-6 gap-3">
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
              <div className="grid grid-cols-6 gap-3">
                {SIZES.map((size) => {
                  const row = stock.data?.totals.find((t) => t.size === size);
                  const warehouse = row?.warehouseUnallocated ?? 0;
                  return (
                    <div key={size} className="rounded-lg border p-3 text-center">
                      <div className="text-xs font-semibold text-muted-foreground">{size}</div>
                      <div className="text-xl font-bold">{warehouse}</div>
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
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: m.marketplaceColor }}
                      />
                      <span className="font-semibold">{m.marketplaceName}</span>
                    </div>
                    <Badge variant="outline">Sale {formatCurrency(m.salePrice)}</Badge>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {m.sizes.map((s) => (
                      <div
                        key={s.size}
                        className={cn(
                          'rounded-md border p-2 text-center text-xs',
                          s.isLowStock && 'border-destructive bg-destructive/5',
                        )}
                      >
                        <div className="font-semibold">{s.size}</div>
                        <div className={cn('text-lg font-bold', s.isLowStock && 'text-destructive')}>
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
        </div>
      </div>
    </div>
  );
}
