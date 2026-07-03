'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuth, useBrand, useBrandActions } from '@/stores';
import { useDeleteBrand } from './api';

/**
 * Danger zone: permanently delete the current brand and everything under it.
 * Platform admins only (matches the API guard on DELETE /brands/:id).
 */
export function DeleteBrandCard() {
  const router = useRouter();
  const { user } = useAuth();
  const { brand, brandId } = useBrand();
  const { setBrandId } = useBrandActions();
  const del = useDeleteBrand();

  if (!user?.isPlatformAdmin || !brandId) return null;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete this brand and everything in it — collections, articles, sizes,
          marketplaces, assignments and members. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          title={`Delete "${brand?.name ?? 'this brand'}"?`}
          description="This permanently deletes the brand and ALL of its data — collections, articles, marketplaces and members. This cannot be undone."
          confirmLabel="Delete this brand"
          onConfirm={async () => {
            await del.mutateAsync(brandId);
            setBrandId(null);
            router.replace('/select-brand');
          }}
          trigger={
            <Button variant="destructive">
              <Trash2 className="h-4 w-4" />
              Delete brand
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
