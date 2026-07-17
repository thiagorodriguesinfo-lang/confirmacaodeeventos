'use client';

import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** guestIds: IDs ja filtrados (status/busca) exatamente como exibidos na tela. */
export function StaffExportPdfButton({ staffToken, guestIds }: { staffToken: string; guestIds: string[] }) {
  const href = `/api/exports/staff/${staffToken}?guestIds=${guestIds.join(',')}`;

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href} download>
        <FileDown className="h-4 w-4" />
        Exportar PDF
      </a>
    </Button>
  );
}
