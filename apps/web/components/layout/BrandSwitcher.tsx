'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth, useBrand, useBrandActions } from '@/stores';
import { CreateBrandDialog } from '@/features/brands/CreateBrandDialog';
import { cn } from '@/lib/utils';

export function BrandSwitcher() {
  const [open, setOpen] = useState(false);
  const { brand, brandId, memberships } = useBrand();
  const { setBrandId } = useBrandActions();
  const { user } = useAuth();
  const router = useRouter();

  const pick = (id: string) => {
    setBrandId(id);
    setOpen(false);
    router.replace('/warehouse');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md border bg-card p-2 text-left transition hover:bg-accent">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold uppercase">
              {brand?.name.slice(0, 2) ?? '??'}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-sm font-semibold">{brand?.name ?? 'Choose brand'}</div>
            <div className="truncate text-xs text-muted-foreground">{brand?.slug}</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {memberships.map((m) => (
            <button
              key={m.brandId}
              onClick={() => pick(m.brandId)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-accent',
                m.brandId === brandId && 'bg-accent',
              )}
            >
              {m.brand.logoUrl ? (
                <img src={m.brand.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-xs font-bold uppercase">
                  {m.brand.name.slice(0, 2)}
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold">{m.brand.name}</div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
              {m.brandId === brandId && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
        {user?.isPlatformAdmin && (
          <div className="border-t pt-3">
            <CreateBrandDialog
              trigger={
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4" />
                  Create new brand
                </Button>
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
