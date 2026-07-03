'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import {
  PERMISSIONS,
  updateBrandSchema,
  type Brand,
  type UpdateBrandInput,
} from '@bilal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Can } from '@/components/common/Can';
import { useBrand } from '@/stores';
import { useUpdateCurrentBrand } from './api';

export function BrandDetailsForm() {
  const { brand } = useBrand();
  const update = useUpdateCurrentBrand();

  const form = useForm<UpdateBrandInput>({
    resolver: zodResolver(updateBrandSchema),
    defaultValues: brandToForm(brand),
  });

  useEffect(() => {
    if (brand) form.reset(brandToForm(brand));
  }, [brand, form]);

  const onSubmit = async (values: UpdateBrandInput) => {
    await update.mutateAsync(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand details</CardTitle>
        <CardDescription>Rename this brand and adjust its slug or description.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Name</Label>
            <Input id="brand-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-slug">Slug</Label>
            <Input id="brand-slug" {...form.register('slug')} placeholder="my-brand" />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers and dashes only. Used in URLs and integrations.
            </p>
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea id="brand-description" rows={3} {...form.register('description')} />
          </div>
          <Can
            permission={PERMISSIONS.BRAND_UPDATE}
            fallback={
              <p className="text-xs italic text-muted-foreground">
                You don't have permission to edit this brand.
              </p>
            }
          >
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </Can>
        </form>
      </CardContent>
    </Card>
  );
}

function brandToForm(brand: Brand | null): UpdateBrandInput {
  return {
    name: brand?.name ?? '',
    slug: brand?.slug ?? '',
    description: brand?.description ?? '',
  };
}
