'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({ value, onChange, disabled, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value);

  const handleSelect = (file: File | null) => {
    if (!file) {
      setPreview(null);
      onChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onChange(file);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <div className="relative h-48 w-48 overflow-hidden rounded-lg border bg-muted">
          <img src={preview} alt="Article" className="h-full w-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={() => handleSelect(null)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {disabled ? <Loader2 className="h-8 w-8 animate-spin" /> : <ImagePlus className="h-8 w-8" />}
          <span className="text-xs">Add image</span>
        </button>
      )}
    </div>
  );
}
