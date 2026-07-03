'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import {
  SIZES,
  assignArticleToMarketplaceSchema,
  type Article,
  type AssignArticleToMarketplaceInput,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarketplaces } from '@/features/marketplaces/api';
import { useAssignArticle } from './api';

interface ExistingAssignment {
  marketplaceId: string;
  salePrice: number;
}

interface Props {
  article: Article;
  existingAssignments?: ExistingAssignment[];
}

export function AssignToMarketplaceDialog({ article, existingAssignments = [] }: Props) {
  const [open, setOpen] = useState(false);
  const marketplaces = useMarketplaces();
  const assign = useAssignArticle();

  const form = useForm<AssignArticleToMarketplaceInput>({
    resolver: zodResolver(assignArticleToMarketplaceSchema),
    defaultValues: {
      articleId: article.id,
      marketplaceId: '',
      salePrice: 0,
      allocations: SIZES.map((size) => ({ size, quantity: 0 })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'allocations' });

  const selectedMarketplaceId = form.watch('marketplaceId');
  const existing = existingAssignments.find((e) => e.marketplaceId === selectedMarketplaceId);

  useEffect(() => {
    if (!selectedMarketplaceId) return;
    const match = existingAssignments.find((e) => e.marketplaceId === selectedMarketplaceId);
    form.setValue('salePrice', match ? match.salePrice : 0, { shouldDirty: false });
  }, [selectedMarketplaceId, existingAssignments, form]);

  const onSubmit = async (values: AssignArticleToMarketplaceInput) => {
    const payload = {
      ...values,
      allocations: values.allocations.filter((a) => a.quantity > 0),
    };
    await assign.mutateAsync(payload);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="h-4 w-4" />
          Assign to Marketplace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign "{article.name}" to marketplace</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select
                value={form.watch('marketplaceId')}
                onValueChange={(v) => form.setValue('marketplaceId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose marketplace" />
                </SelectTrigger>
                <SelectContent>
                  {marketplaces.data?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: m.color }} />
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Sale price at this marketplace</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                {...form.register('salePrice', { valueAsNumber: true })}
              />
              {existing && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled from existing assignment. Edit only if you want to change the price.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allocate per size (warehouse available shown below)</Label>
            <div className="grid grid-cols-6 gap-2">
              {fields.map((field, idx) => {
                const warehouseQty =
                  article.sizes.find((s) => s.size === field.size)?.warehouseQuantity ?? 0;
                return (
                  <div key={field.id} className="space-y-1">
                    <Label className="block text-center text-xs">
                      {field.size}
                      <span className="ml-1 text-muted-foreground">/{warehouseQty}</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={warehouseQty}
                      className="text-center"
                      {...form.register(`allocations.${idx}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                );
              })}
            </div>
            {form.formState.errors.allocations && (
              <p className="text-xs text-destructive">
                {form.formState.errors.allocations.message?.toString()}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
