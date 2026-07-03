'use client';

import { useMemo, useRef, useState } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { groupImportRows, type ParsedImportRow } from '@bilal/shared';
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
import { toast } from 'sonner';
import { mapWarehouseCsv, parseCsv, type SkippedRow } from '@/lib/csv';
import { useImportWarehouse } from './api';

interface Parsed {
  fileName: string;
  rows: ParsedImportRow[];
  skipped: SkippedRow[];
}

export function ImportWarehouseDialog() {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importMut = useImportWarehouse();

  const summary = useMemo(() => {
    if (!parsed) return null;
    const { collections, duplicateSizes } = groupImportRows(parsed.rows);
    const articles = collections.reduce((sum, c) => sum + c.articles.length, 0);
    const withImages = collections.reduce(
      (sum, c) => sum + c.articles.filter((a) => a.imageUrl).length,
      0,
    );
    return {
      collections: collections.length,
      articles,
      sizes: parsed.rows.length,
      withImages,
      duplicateSizes: duplicateSizes.length,
    };
  }, [parsed]);

  const reset = () => {
    setParsed(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const { rows, skipped } = mapWarehouseCsv(parseCsv(text));
      if (rows.length === 0) {
        setParsed(null);
        setError('No valid rows found in this file. Expected the Buraq stock CSV layout.');
        return;
      }
      setParsed({
        fileName: file.name,
        rows: rows.map((r) => ({ ...r, imageUrl: r.imageUrl ?? null })),
        skipped,
      });
    } catch {
      setParsed(null);
      setError('Could not read this file.');
    }
  };

  const onImport = async () => {
    if (!parsed) return;
    try {
      const res = await importMut.mutateAsync(parsed.rows);
      toast.success(
        `Imported ${res.articlesCreated} articles in ${res.collectionsCreated} new collections ` +
          `(${res.sizesCreated} sizes)` +
          (res.articlesUpdated ? `, updated ${res.articlesUpdated}` : ''),
      );
      setOpen(false);
      reset();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importMut.isPending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import factory stock</DialogTitle>
          <DialogDescription>
            Upload the Buraq stock CSV. Collections, articles, per-size SKUs, quantities and image
            links are created. Existing articles (matched by SKU) are updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-accent/50">
            <FileUp className="h-6 w-6" />
            <span>{parsed ? parsed.fileName : 'Choose a .csv file'}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {summary && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Collections" value={summary.collections} />
                <Stat label="Articles" value={summary.articles} />
                <Stat label="Size rows" value={summary.sizes} />
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>{summary.withImages} articles have an image link.</p>
                {summary.duplicateSizes > 0 && (
                  <p>{summary.duplicateSizes} duplicate size rows will be ignored.</p>
                )}
                {parsed && parsed.skipped.length > 0 && (
                  <p className="text-amber-600">
                    {parsed.skipped.length} rows skipped (e.g. {parsed.skipped[0].reason}).
                  </p>
                )}
              </div>
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
            disabled={importMut.isPending}
          >
            Cancel
          </Button>
          <Button onClick={onImport} disabled={!parsed || importMut.isPending}>
            {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {summary ? `${summary.articles} articles` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
