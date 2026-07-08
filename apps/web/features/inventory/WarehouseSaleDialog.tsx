'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Receipt } from 'lucide-react';
import { warehouseSaleSchema, type WarehouseSaleInput, type Article, type Size } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRecordWarehouseSale } from './api';

/** Records a sale made directly from the warehouse, instead of editing stock down. */
export function WarehouseSaleDialog({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  const recordSale = useRecordWarehouseSale();
  const inStockSizes = article.sizes.filter((s) => s.warehouseQuantity > 0);

  const form = useForm<WarehouseSaleInput>({
    resolver: zodResolver(warehouseSaleSchema),
    defaultValues: {
      articleId: article.id,
      size: inStockSizes[0]?.size ?? 'M',
      quantity: 1,
      unitPrice: Number(article.purchasePrice) || undefined,
      notes: '',
    },
  });

  const selectedSize = form.watch('size');
  const maxQty = inStockSizes.find((s) => s.size === selectedSize)?.warehouseQuantity ?? 0;

  const onSubmit = async (values: WarehouseSaleInput) => {
    await recordSale.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={inStockSizes.length === 0}>
          <Receipt className="h-4 w-4" />
          Record Sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record warehouse sale — {article.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          For pieces sold directly from the warehouse (not through a marketplace). Stock is
          deducted and the sale is kept in this article&apos;s history.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={selectedSize} onValueChange={(v) => form.setValue('size', v as Size)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inStockSizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size} ({s.warehouseQuantity} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-sale-quantity">Quantity sold</Label>
              <Input
                id="wh-sale-quantity"
                type="number"
                min={1}
                max={maxQty}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Max: {maxQty}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-sale-price">Sale price (per unit)</Label>
              <Input
                id="wh-sale-price"
                type="number"
                min={1}
                step="0.01"
                {...form.register('unitPrice', { valueAsNumber: true })}
              />
              {form.formState.errors.unitPrice && (
                <p className="text-xs text-destructive">Enter a valid price.</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-sale-notes">Notes (optional)</Label>
            <Textarea id="wh-sale-notes" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Record'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
