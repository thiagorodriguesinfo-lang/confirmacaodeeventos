import Link from 'next/link';
import { Plus, MapPin, Users } from 'lucide-react';
import { listMyEventsAction } from '@/actions/event.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { prisma } from '@/infrastructure/database/prisma';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export default async function DashboardHomePage() {
  const events = await listMyEventsAction();
  const guestCounts = await Promise.all(events.map((e) => prisma.guest.count({ where: { eventId: e.id } })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meus eventos</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas confirmações de presença via WhatsApp</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Novo evento
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">Você ainda não criou nenhum evento.</p>
            <Button asChild>
              <Link href="/dashboard/events/new">Criar meu primeiro evento</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{event.name}</CardTitle>
                    <Badge variant={event.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {STATUS_LABEL[event.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{formatDate(event.date)} às {event.time}</p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {event.location}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {guestCounts[i]} convidados
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
