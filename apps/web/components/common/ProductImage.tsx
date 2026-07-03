'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a product image from an arbitrary URL (e.g. a Shopify CDN link). Uses a
 * native <img> on purpose so any external host works without next/image host
 * allowlisting, and falls back to a placeholder when the src is empty or fails.
 */
export function ProductImage({ src, alt, className, iconClassName }: Props) {
  const [errored, setErrored] = useState(false);

  // Reset the error state whenever the source changes.
  useEffect(() => setErrored(false), [src]);

  if (!src || errored) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
          className,
        )}
      >
        <Package className={cn('h-12 w-12', iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
