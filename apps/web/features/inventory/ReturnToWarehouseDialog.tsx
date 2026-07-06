'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PackageMinus } from 'lucide-react';
import { returnToWarehouseSchema, type ReturnToWarehouseInput, type Size } from '@bilal/shared';
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
import { useReturnToWarehouse } from './api';

interface Props {
  marketplaceArticleId: string;
  articleName: string;
  /** Per-size allocated counts; only sizes with stock here can be returned. */
  sizes: { size: Size; allocated: number }[];
}

/** Fixes over-allocation: moves units from this marketplace back to the warehouse. */
export function ReturnToWarehouseDialog({ marketplaceArticleId, articleName, sizes }: Props) {
  const [open, setOpen] = useState(false);
  const returnToWarehouse = useReturnToWarehouse();
  const allocatedSizes = sizes.filter((s) => s.allocated > 0);

  const form = useForm<ReturnToWarehouseInput>({
    resolver: zodResolver(returnToWarehouseSchema),
    defaultValues: {
      marketplaceArticleId,
      size: allocatedSizes[0]?.size ?? 'M',
      quantity: 1,
      notes: '',
    },
  });

  const selectedSize = form.watch('size');
  const maxQty = allocatedSizes.find((s) => s.size === selectedSize)?.allocated ?? 0;

  const onSubmit = async (values: ReturnToWarehouseInput) => {
    await returnToWarehouse.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={allocatedSizes.length === 0}>
          <PackageMinus className="h-4 w-4" />
          Return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return to warehouse — {articleName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Use this to fix an over-allocation. The units leave this marketplace and go back into
          warehouse stock.
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
                  {allocatedSizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size} ({s.allocated} here)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-quantity">Quantity to return</Label>
              <Input
                id="return-quantity"
                type="number"
                min={1}
                max={maxQty}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Max: {maxQty}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-notes">Reason (optional)</Label>
            <Textarea id="return-notes" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Return to warehouse'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
