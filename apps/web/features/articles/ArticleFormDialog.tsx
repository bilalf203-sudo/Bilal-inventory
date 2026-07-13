'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { SIZES, createArticleSchema, type Article, type CreateArticleInput } from '@bilal/shared';
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
import { ImageUpload } from '@/components/common/ImageUpload';
import { useCreateArticle, useUpdateArticle, useUploadArticleImage } from './api';

interface Props {
  collectionId: string;
  article?: Article;
  trigger?: React.ReactNode;
}

export function ArticleFormDialog({ collectionId, article, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const create = useCreateArticle();
  const update = useUpdateArticle();
  const uploadImage = useUploadArticleImage();
  const editing = !!article;

  const form = useForm<CreateArticleInput>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: {
      collectionId,
      name: article?.name ?? '',
      code: article?.code,
      description: article?.description ?? '',
      purchasePrice: Number(article?.purchasePrice ?? 0),
      imageUrl: article?.imageUrl ?? '',
      sizes: SIZES.map((size) => {
        const existing = article?.sizes.find((s) => s.size === size);
        return { size, quantity: existing?.warehouseQuantity ?? 0, sku: existing?.sku ?? null };
      }),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'sizes' });

  useEffect(() => {
    if (!open) return;
    form.reset({
      collectionId,
      name: article?.name ?? '',
      code: article?.code,
      description: article?.description ?? '',
      purchasePrice: Number(article?.purchasePrice ?? 0),
      imageUrl: article?.imageUrl ?? '',
      sizes: SIZES.map((size) => {
        const existing = article?.sizes.find((s) => s.size === size);
        return { size, quantity: existing?.warehouseQuantity ?? 0, sku: existing?.sku ?? null };
      }),
    });
  }, [open, article, collectionId, form]);

  const onSubmit = async (values: CreateArticleInput) => {
    let result: Article;
    if (editing) {
      result = await update.mutateAsync({
        id: article.id,
        data: { ...values, collectionId: undefined } as never,
      });
    } else {
      result = await create.mutateAsync(values);
    }
    if (imageFile) {
      await uploadImage.mutateAsync({ id: result.id, file: imageFile });
    }
    setOpen(false);
    setImageFile(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit article' : 'Create article'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <ImageUpload
              value={article?.imageUrl ?? null}
              onChange={setImageFile}
              disabled={uploadImage.isPending}
              className="items-center sm:items-start"
            />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Article code (optional)</Label>
                  <Input
                    id="code"
                    placeholder="Auto from size SKUs"
                    {...form.register('code', {
                      setValueAs: (v) => {
                        const t = typeof v === 'string' ? v.trim() : v;
                        return t ? t : undefined;
                      },
                    })}
                  />
                  {form.formState.errors.code ? (
                    <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                  ) : (
                    !editing && (
                      <p className="text-xs text-muted-foreground">
                        Left empty, it&apos;s generated from the size SKUs or the name.
                      </p>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (factory)</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    {...form.register('purchasePrice', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (CDN link)</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://cdn.shopify.com/..."
                  {...form.register('imageUrl', {
                    setValueAs: (v) => {
                      const t = typeof v === 'string' ? v.trim() : v;
                      return t ? t : null;
                    },
                  })}
                />
                {form.formState.errors.imageUrl && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.imageUrl.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={2} {...form.register('description')} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stock &amp; SKU per size</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-[2.5rem_1fr_2fr] items-center gap-2 px-1 text-xs text-muted-foreground">
                <span>Size</span>
                <span>Quantity</span>
                <span>SKU (optional)</span>
              </div>
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[2.5rem_1fr_2fr] items-start gap-2">
                  <Label className="pt-2.5 pl-1 text-xs font-bold">{field.size}</Label>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min={0}
                      {...form.register(`sizes.${idx}.quantity`, {
                        setValueAs: (v) => {
                          const n = Number(v);
                          return v === '' || v === null || v === undefined || Number.isNaN(n)
                            ? 0
                            : n;
                        },
                      })}
                      className="text-center"
                    />
                    {form.formState.errors.sizes?.[idx]?.quantity && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.sizes[idx]?.quantity?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      placeholder={`e.g. ${form.watch('code') || 'CODE'}-${field.size}`}
                      {...form.register(`sizes.${idx}.sku`, {
                        setValueAs: (v) => {
                          const t = typeof v === 'string' ? v.trim() : v;
                          return t ? t : null;
                        },
                      })}
                      className="font-mono text-xs"
                    />
                    {form.formState.errors.sizes?.[idx]?.sku && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.sizes[idx]?.sku?.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting || uploadImage.isPending}>
              {(form.formState.isSubmitting || uploadImage.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
