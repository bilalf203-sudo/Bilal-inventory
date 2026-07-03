'use client';

import { Loader2, ShoppingBag } from 'lucide-react';
import { PERMISSIONS } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { EmptyState } from '@/components/common/EmptyState';
import { MarketplaceFormDialog } from '@/features/marketplaces/MarketplaceFormDialog';
import { useDeleteMarketplace, useMarketplaces } from '@/features/marketplaces/api';

export default function MarketplacesSettingsPage() {
  const { data, isLoading } = useMarketplaces(true);
  const remove = useDeleteMarketplace();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplaces</h1>
          <p className="text-sm text-muted-foreground">
            Manage marketplace tabs that appear in the sidebar.
          </p>
        </div>
        <Can permission={PERMISSIONS.MARKETPLACE_CREATE}>
          <MarketplaceFormDialog />
        </Can>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="h-8 w-8 rounded-md" style={{ backgroundColor: m.color }} />
                <div className="flex-1">
                  <div className="font-semibold">{m.name}</div>
                  {m.description && (
                    <div className="text-sm text-muted-foreground">{m.description}</div>
                  )}
                </div>
                <Can permission={PERMISSIONS.MARKETPLACE_UPDATE}>
                  <MarketplaceFormDialog
                    marketplace={m}
                    trigger={<Button variant="outline" size="sm">Edit</Button>}
                  />
                </Can>
                <Can permission={PERMISSIONS.MARKETPLACE_DELETE}>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${m.name}"? Assigned articles will be detached.`)) {
                        remove.mutate(m.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Can>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title="No marketplaces"
          description="Create your first marketplace to start assigning articles."
          action={
            <Can permission={PERMISSIONS.MARKETPLACE_CREATE}>
              <MarketplaceFormDialog />
            </Can>
          }
        />
      )}
    </div>
  );
}
