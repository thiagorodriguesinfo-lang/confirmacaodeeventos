import { Badge } from '@/components/ui/badge';

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  CONFIRMED: { label: 'Confirmado', variant: 'success' },
  DECLINED: { label: 'Recusado', variant: 'destructive' },
  SENT: { label: 'Enviado', variant: 'warning' },
  PENDING: { label: 'Pendente', variant: 'secondary' },
  NO_RESPONSE: { label: 'Sem resposta', variant: 'secondary' },
};

export function GuestStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
