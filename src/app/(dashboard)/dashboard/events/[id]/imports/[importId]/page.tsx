import { notFound } from 'next/navigation';
import { getImportWithLogsAction } from '@/actions/import.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApproveAllButton } from './approve-all-button';
import { ImportLogRow } from './import-log-row';

export default async function ImportReviewPage({ params }: { params: { id: string; importId: string } }) {
  const importBatch = await getImportWithLogsAction(params.importId);
  if (!importBatch) notFound();

  const pendingLogs = importBatch.logs.filter((l) => l.status === 'PENDING');
  const resolvedLogs = importBatch.logs.filter((l) => l.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revisão de importação</h1>
          <p className="text-sm text-muted-foreground">
            {importBatch.logs.length} contatos • {pendingLogs.length} aguardando revisão
          </p>
        </div>
        {pendingLogs.length > 0 && <ApproveAllButton importId={importBatch.id} eventId={params.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aguardando revisão ({pendingLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingLogs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato pendente.</p>}
          {pendingLogs.map((log) => (
            <ImportLogRow key={log.id} log={log} importId={importBatch.id} eventId={params.id} />
          ))}
        </CardContent>
      </Card>

      {resolvedLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Já revisados ({resolvedLogs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>
                  {log.rawName || '(sem nome)'} — {log.normalizedPhone || log.rawPhone || '(sem telefone)'}
                </span>
                <span className="text-xs uppercase text-muted-foreground">{log.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
