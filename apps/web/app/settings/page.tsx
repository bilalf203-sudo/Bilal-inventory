'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PERMISSIONS } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Can } from '@/components/common/Can';
import { BrandDetailsForm } from '@/features/brands/BrandDetailsForm';
import { DeleteBrandCard } from '@/features/brands/DeleteBrandCard';
import { useSettings, useUpdateLowStockThreshold } from '@/features/settings/api';

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateLowStockThreshold();
  const [threshold, setThreshold] = useState<number>(10);

  useEffect(() => {
    if (settings.data?.lowStockThreshold) setThreshold(settings.data.lowStockThreshold);
  }, [settings.data]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configuration for the current brand.</p>
      </div>

      <BrandDetailsForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Low-stock threshold</CardTitle>
          <CardDescription>
            Articles with any size below this number show as red across the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="threshold">Threshold (pieces)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  max={10000}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
              <Can permission={PERMISSIONS.SETTINGS_UPDATE}>
                <Button
                  className="mt-7"
                  onClick={() => update.mutate(threshold)}
                  disabled={update.isPending}
                >
                  {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </Can>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteBrandCard />
    </div>
  );
}
