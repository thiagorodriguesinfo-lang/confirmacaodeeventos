import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FORMATS: { format: 'xlsx' | 'csv' | 'pdf'; label: string }[] = [
  { format: 'xlsx', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
];

export function ExportButtons({ eventId }: { eventId: string }) {
  return (
    <div className="flex gap-2">
      {FORMATS.map(({ format, label }) => (
        <Button key={format} variant="outline" size="sm" asChild>
          <a href={`/api/exports/${eventId}?format=${format}&order=confirmation`} download>
            <Download className="h-4 w-4" />
            {label}
          </a>
        </Button>
      ))}
    </div>
  );
}
