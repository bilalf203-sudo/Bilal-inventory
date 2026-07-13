import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-shaped loading placeholders, one per page layout, so pages paint
 * their real structure immediately while data streams in — no centered
 * spinner and layout jump.
 */

/** Grid of header-style cards (warehouse collections, marketplace collections). */
export function CollectionCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/** Grid of image cards (articles in a collection). */
export function ArticleCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <CardContent className="space-y-3 p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 6 }, (_, j) => (
                <Skeleton key={j} className="h-5 w-12 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-3 w-1/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Horizontal article rows (articles assigned to a marketplace). */
export function ArticleRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
                <div className="flex flex-wrap gap-1 pt-1">
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-5 w-14 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
              <div className="space-y-1">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Full article-detail layout: image card + size table + stock grids. */
export function ArticleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Skeleton className="aspect-square w-full rounded-none" />
          <CardContent className="p-4">
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-16 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Analytics dashboard: KPI cards, counters, sections and the articles table. */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
