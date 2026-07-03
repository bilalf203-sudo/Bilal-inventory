'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { SalesReportPreview } from '@bilal/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mapSaleReportCsv, parseCsv, type SkippedRow } from '@/lib/csv';
import { useCommitSalesReport, usePreviewSalesReport } from './api';

interface Props {
  marketplaceId: string;
  marketplaceName: string;
}

export function SaleReportDialog({ marketplaceId, marketplaceName }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [preview, setPreview] = useState<SalesReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewMut = usePreviewSalesReport();
  const commitMut = useCommitSalesReport();
  const busy = previewMut.isPending || commitMut.isPending;

  const reset = () => {
    setFileName(null);
    setSkipped([]);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const { rows, skipped: skippedRows } = mapSaleReportCsv(parseCsv(text));
      setSkipped(skippedRows);
      if (rows.length === 0) {
        setError('No rows with a remaining quantity were found in this file.');
        return;
      }
      const result = await previewMut.mutateAsync({ marketplaceId, rows });
      setPreview(result);
    } catch (e) {
      setError((e as Error).message || 'Could not read this file.');
    }
  };

  const onConfirm = async () => {
    if (!preview || preview.items.length === 0) return;
    const deductions = preview.items.map((i) => ({
      sku: i.sku,
      size: i.size,
      quantity: i.willDeduct,
    }));
    try {
      const res = await commitMut.mutateAsync({ marketplaceId, deductions });
      toast.success(`Deducted ${res.totalDeducted} pieces across ${res.applied} lines`);
      setOpen(false);
      reset();
    } catch {
      /* handled by hook toast */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Upload sale report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Daily sale report — {marketplaceName}</DialogTitle>
          <DialogDescription>
            Upload today&apos;s stock snapshot (same layout as the stock CSV). Pieces sold are
            computed as current stock minus the remaining stock in the file. Nothing changes until
            you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground hover:bg-accent/50">
            <FileUp className="h-6 w-6" />
            <span>{fileName ?? 'Choose a .csv file'}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>

          {previewMut.isPending && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Comparing against current stock…
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <Stat label="Pieces to deduct" value={preview.totalToDeduct} highlight />
                <Stat label="Lines to change" value={preview.items.length} />
                <Stat label="Not in marketplace" value={preview.unmatchedRows} />
              </div>

              {preview.items.length === 0 ? (
                <p className="rounded-md border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  No reductions detected. Current stock already matches the report
                  {preview.unchangedRows > 0 ? ` (${preview.unchangedRows} rows unchanged)` : ''}.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="p-2 text-left font-medium">Article</th>
                        <th className="p-2 text-center font-medium">Size</th>
                        <th className="p-2 text-right font-medium">Now</th>
                        <th className="p-2 text-right font-medium">Report</th>
                        <th className="p-2 text-right font-medium">Minus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((i) => (
                        <tr key={`${i.sku}-${i.size}`} className="border-t">
                          <td className="p-2">
                            <div className="font-medium">{i.articleName}</div>
                            <div className="text-xs text-muted-foreground">
                              {i.collectionName} · <span className="font-mono">{i.sku}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-semibold">{i.size}</td>
                          <td className="p-2 text-right tabular-nums">{i.currentAllocated}</td>
                          <td className="p-2 text-right tabular-nums">{i.reportRemaining}</td>
                          <td className="p-2 text-right font-bold tabular-nums text-destructive">
                            −{i.willDeduct}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {skipped.length > 0 && (
                <p className="text-xs text-amber-600">
                  {skipped.length} file rows skipped (e.g. {skipped[0].reason}).
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={busy || !preview || preview.items.length === 0}
          >
            {commitMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {preview && preview.items.length > 0
              ? `Confirm — minus ${preview.totalToDeduct} pieces`
              : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className={highlight ? 'text-xl font-bold text-destructive' : 'text-xl font-bold'}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
