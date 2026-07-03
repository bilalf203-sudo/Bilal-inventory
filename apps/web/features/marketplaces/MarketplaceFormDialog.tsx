'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import {
  createMarketplaceSchema,
  type CreateMarketplaceInput,
  type Marketplace,
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateMarketplace, useUpdateMarketplace } from './api';

interface Props {
  marketplace?: Marketplace;
  trigger?: React.ReactNode;
}

export function MarketplaceFormDialog({ marketplace, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const create = useCreateMarketplace();
  const update = useUpdateMarketplace();
  const editing = !!marketplace;

  const form = useForm<CreateMarketplaceInput>({
    resolver: zodResolver(createMarketplaceSchema),
    defaultValues: {
      name: marketplace?.name ?? '',
      description: marketplace?.description ?? '',
      color: marketplace?.color ?? '#3b82f6',
    },
  });

  const onSubmit = async (values: CreateMarketplaceInput) => {
    if (editing) {
      await update.mutateAsync({ id: marketplace.id, data: values });
    } else {
      await create.mutateAsync(values);
    }
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            New Marketplace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit marketplace' : 'New marketplace'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Daraz" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...form.register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Tab color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                className="h-10 w-16 p-1"
                {...form.register('color')}
              />
              <Input className="flex-1 font-mono" {...form.register('color')} />
            </div>
            {form.formState.errors.color && (
              <p className="text-xs text-destructive">{form.formState.errors.color.message}</p>
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
