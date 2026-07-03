'use client';

import { FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuditLog } from '@/features/audit/api';
import { formatDate } from '@/lib/utils';

export default function AuditLogPage() {
  const { data, isLoading } = useAuditLog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Immutable record of changes to the system.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <Badge variant="outline" className="shrink-0 font-mono">
                  {row.entity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{row.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.user?.email ?? 'system'} · {formatDate(row.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="No audit entries yet" />
      )}
    </div>
  );
}
