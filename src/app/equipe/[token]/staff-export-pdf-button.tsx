'use client';

import { useSearchParams } from 'next/navigation';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StaffExportPdfButton({ staffToken }: { staffToken: string }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  searchParams.getAll('status').forEach((status) => params.append('status', status));
  const search = searchParams.get('search');
  if (search) params.set('search', search);

  const href = `/api/exports/staff/${staffToken}${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href} download>
        <FileDown className="h-4 w-4" />
        Exportar PDF
      </a>
    </Button>
  );
}
