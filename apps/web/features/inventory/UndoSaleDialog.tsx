'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Undo2 } from 'lucide-react';
import { undoSaleSchema, type UndoSaleInput, type Size } from '@bilal/shared';
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
import { useUndoSale } from './api';

interface Props {
  marketplaceArticleId: string;
  articleName: string;
  /** Per-size sold counts; only sizes with sold > 0 can be undone. */
  sizes: { size: Size; sold: number }[];
}

/** Fixes a sale recorded by mistake: puts sold units back into marketplace stock. */
export function UndoSaleDialog({ marketplaceArticleId, articleName, sizes }: Props) {
  const [open, setOpen] = useState(false);
  const undoSale = useUndoSale();
  const soldSizes = sizes.filter((s) => s.sold > 0);

  const form = useForm<UndoSaleInput>({
    resolver: zodResolver(undoSaleSchema),
    defaultValues: {
      marketplaceArticleId,
      size: soldSizes[0]?.size ?? 'M',
      quantity: 1,
      notes: '',
    },
  });

  const selectedSize = form.watch('size');
  const maxQty = soldSizes.find((s) => s.size === selectedSize)?.sold ?? 0;

  const onSubmit = async (values: UndoSaleInput) => {
    await undoSale.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={soldSizes.length === 0}>
          <Undo2 className="h-4 w-4" />
          Undo sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo sale — {articleName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Use this to correct a sale that was recorded by mistake. The units go back into this
          marketplace&apos;s stock.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={selectedSize} onValueChange={(v) => form.setValue('size', v as Size)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {soldSizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size} ({s.sold} sold)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="undo-quantity">Quantity to undo</Label>
              <Input
                id="undo-quantity"
                type="number"
                min={1}
                max={maxQty}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Max: {maxQty}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="undo-notes">Reason (optional)</Label>
            <Textarea id="undo-notes" rows={2} {...form.register('notes')} />
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
