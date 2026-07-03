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
        <h1 className="text-2xl font-bold">Audit Log</h1>
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
              <CardContent className="flex items-center gap-4 p-3">
                <Badge variant="outline" className="font-mono">
                  {row.entity}
                </Badge>
                <div className="flex-1">
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
