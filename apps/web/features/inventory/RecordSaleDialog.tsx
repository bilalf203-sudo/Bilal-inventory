'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Receipt } from 'lucide-react';
import { recordSaleSchema, type RecordSaleInput, type Size } from '@bilal/shared';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRecordSale } from './api';

interface Props {
  marketplaceArticleId: string;
  articleName: string;
  availableSizes: { size: Size; allocated: number }[];
}

export function RecordSaleDialog({ marketplaceArticleId, articleName, availableSizes }: Props) {
  const [open, setOpen] = useState(false);
  const recordSale = useRecordSale();
  const inStockSizes = availableSizes.filter((s) => s.allocated > 0);

  const form = useForm<RecordSaleInput>({
    resolver: zodResolver(recordSaleSchema),
    defaultValues: {
      marketplaceArticleId,
      size: inStockSizes[0]?.size ?? 'M',
      quantity: 1,
      notes: '',
    },
  });

  const selectedSize = form.watch('size');
  const maxQty = inStockSizes.find((s) => s.size === selectedSize)?.allocated ?? 0;

  const onSubmit = async (values: RecordSaleInput) => {
    await recordSale.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={inStockSizes.length === 0}>
          <Receipt className="h-4 w-4" />
          Record Sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record sale — {articleName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={selectedSize} onValueChange={(v) => form.setValue('size', v as Size)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inStockSizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size} ({s.allocated} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity sold</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQty}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Max: {maxQty}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
