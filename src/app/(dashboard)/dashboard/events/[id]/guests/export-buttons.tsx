import { Download, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FORMATS: { format: 'xlsx' | 'csv' | 'pdf'; label: string }[] = [
  { format: 'xlsx', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
];

export function ExportButtons({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" asChild>
        <a href={`/api/exports/${eventId}?format=pdf&order=buffet`} download>
          <ClipboardList className="h-4 w-4" />
          Lista de confirmados (PDF)
        </a>
      </Button>

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
