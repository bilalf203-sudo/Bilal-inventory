'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, ChevronRight, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useAuthActions, useBrand, useBrandActions } from '@/stores';
import { CreateBrandDialog } from '@/features/brands/CreateBrandDialog';

export default function SelectBrandPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { signOut } = useAuthActions();
  const { memberships } = useBrand();
  const { setBrandId } = useBrandActions();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pickBrand = (brandId: string) => {
    setBrandId(brandId);
    router.replace('/warehouse');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 text-center">
          <Boxes className="h-7 w-7" />
          <span className="text-xl font-bold">Bilal Inventory</span>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold">Choose a brand</h1>
              <p className="text-sm text-muted-foreground">
                Signed in as {user?.email}. Pick which brand workspace to open.
              </p>
            </div>

            <div className="space-y-2">
              {memberships.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  You're not a member of any brand yet.
                  {user?.isPlatformAdmin && ' Create one to get started.'}
                </div>
              ) : (
                memberships.map((m) => (
                  <button
                    key={m.brandId}
                    onClick={() => pickBrand(m.brandId)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-accent"
                  >
                    {m.brand.logoUrl ? (
                      <img src={m.brand.logoUrl} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 font-bold uppercase">
                        {m.brand.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{m.brand.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.brand.slug} · {m.role}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>

            {user?.isPlatformAdmin && (
              <div className="border-t pt-4">
                <CreateBrandDialog />
              </div>
            )}

            <div className="flex justify-end border-t pt-3">
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
