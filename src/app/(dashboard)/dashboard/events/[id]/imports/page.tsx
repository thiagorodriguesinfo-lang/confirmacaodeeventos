import { notFound } from 'next/navigation';
import Link from 'next/link';
import { container } from '@/infrastructure/container';
import { listImportsAction } from '@/actions/import.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportUploadForm } from './import-upload-form';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  PENDING_REVIEW: { label: 'Aguardando revisão', variant: 'warning' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  PARTIALLY_APPROVED: { label: 'Parcialmente aprovado', variant: 'secondary' },
  REJECTED: { label: 'Rejeitado', variant: 'destructive' },
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  CSV: 'CSV',
  EXCEL: 'Excel',
  PASTE: 'Lista colada',
  WHATSAPP_FORWARD: 'WhatsApp (contatos encaminhados)',
  VCARD: 'VCard',
};

export default async function ImportsPage({ params }: { params: { id: string } }) {
  const event = await container.eventRepository.findById(params.id);
  if (!event) notFound();

  const imports = await listImportsAction(params.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contatos recebidos</h1>
        <p className="text-sm text-muted-foreground">
          Revise, corrija e aprove contatos antes que eles virem convidados. Contatos encaminhados para o
          WhatsApp do sistema também aparecem aqui automaticamente.
        </p>
      </div>

      <ImportUploadForm eventId={params.id} />

      <div className="space-y-3">
        {imports.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Nenhuma importação ainda.</CardContent>
          </Card>
        )}
        {imports.map((imp) => {
          const status = STATUS_LABEL[imp.status] ?? { label: imp.status, variant: 'secondary' as const };
          return (
            <Link key={imp.id} href={`/dashboard/events/${params.id}/imports/${imp.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {SOURCE_LABEL[imp.source] ?? imp.source}
                      {imp.fileName ? ` — ${imp.fileName}` : ''}
                      {imp.senderName ? ` — enviado por ${imp.senderName}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imp.totalContacts || imp.approvedCount + imp.rejectedCount + imp.duplicateCount} contatos •{' '}
                      {new Date(imp.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{imp.approvedCount} aprovados</span>
                    <span>{imp.duplicateCount} duplicados</span>
                    <span>{imp.rejectedCount} rejeitados</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
