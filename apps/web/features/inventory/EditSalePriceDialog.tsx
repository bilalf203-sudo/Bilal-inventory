'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil } from 'lucide-react';
import { updateSalePriceSchema, type UpdateSalePriceInput } from '@bilal/shared';
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
import { useUpdateSalePrice } from './api';

interface Props {
  marketplaceArticleId: string;
  articleName: string;
  currentPrice: number;
}

export function EditSalePriceDialog({ marketplaceArticleId, articleName, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const updatePrice = useUpdateSalePrice();

  const form = useForm<UpdateSalePriceInput>({
    resolver: zodResolver(updateSalePriceSchema),
    defaultValues: { marketplaceArticleId, salePrice: currentPrice },
  });

  const onSubmit = async (values: UpdateSalePriceInput) => {
    await updatePrice.mutateAsync(values);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit sale price">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit sale price — {articleName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sale-price">Sale price</Label>
            <Input
              id="sale-price"
              type="number"
              min={1}
              step="0.01"
              {...form.register('salePrice', { valueAsNumber: true })}
            />
            {form.formState.errors.salePrice && (
              <p className="text-xs text-destructive">Enter a valid price greater than zero.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
