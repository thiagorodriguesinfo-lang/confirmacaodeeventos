import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'success' | 'destructive' | 'warning' | 'primary';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            accent === 'success' && 'bg-success/10 text-success',
            accent === 'destructive' && 'bg-destructive/10 text-destructive',
            accent === 'warning' && 'bg-warning/10 text-warning',
            (!accent || accent === 'primary') && 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
