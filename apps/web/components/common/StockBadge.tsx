import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StockBadgeProps {
  size: string;
  quantity: number;
  isLowStock?: boolean;
  className?: string;
}

export function StockBadge({ size, quantity, isLowStock, className }: StockBadgeProps) {
  return (
    <Badge
      variant={quantity === 0 ? 'secondary' : isLowStock ? 'destructive' : 'outline'}
      className={cn('font-mono tabular-nums gap-1', className)}
    >
      <span className="font-bold">{size}</span>
      <span>·</span>
      <span>{quantity}</span>
    </Badge>
  );
}
