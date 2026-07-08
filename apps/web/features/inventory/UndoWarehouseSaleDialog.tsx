'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Undo2 } from 'lucide-react';
import {
  undoWarehouseSaleSchema,
  type UndoWarehouseSaleInput,
  type Article,
  type Size,
} from '@bilal/shared';
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
import { useUndoWarehouseSale } from './api';

/** Fixes a warehouse sale recorded by mistake: units go back into warehouse stock. */
export function UndoWarehouseSaleDialog({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  const undoSale = useUndoWarehouseSale();
  const soldSizes = article.sizes.filter((s) => (s.soldQuantity ?? 0) > 0);

  const form = useForm<UndoWarehouseSaleInput>({
    resolver: zodResolver(undoWarehouseSaleSchema),
    defaultValues: {
      articleId: article.id,
      size: soldSizes[0]?.size ?? 'M',
      quantity: 1,
      notes: '',
    },
  });

  const selectedSize = form.watch('size');
  const maxQty = soldSizes.find((s) => s.size === selectedSize)?.soldQuantity ?? 0;

  const onSubmit = async (values: UndoWarehouseSaleInput) => {
    await undoSale.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={soldSizes.length === 0}>
          <Undo2 className="h-4 w-4" />
          Undo sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo warehouse sale — {article.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Use this to correct a warehouse sale recorded by mistake. The units go back into
          warehouse stock.
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
                  {soldSizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size} ({s.soldQuantity} sold)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-undo-quantity">Quantity to undo</Label>
              <Input
                id="wh-undo-quantity"
                type="number"
                min={1}
                max={maxQty}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Max: {maxQty}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-undo-price">Original price (optional)</Label>
              <Input
                id="wh-undo-price"
                type="number"
                min={1}
                step="0.01"
                {...form.register('unitPrice', {
                  setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                })}
              />
              <p className="text-xs text-muted-foreground">Keeps revenue totals accurate.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-undo-notes">Reason (optional)</Label>
            <Textarea id="wh-undo-notes" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Undo sale'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
