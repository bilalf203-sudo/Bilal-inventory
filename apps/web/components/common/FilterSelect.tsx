'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  icon?: LucideIcon;
  className?: string;
  ariaLabel?: string;
}

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  icon: Icon,
  className,
  ariaLabel,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-auto min-w-[140px] gap-2', className)} aria-label={ariaLabel}>
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
