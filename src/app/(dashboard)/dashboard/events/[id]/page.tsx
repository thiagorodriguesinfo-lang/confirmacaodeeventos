import { notFound } from 'next/navigation';
import { Users, UserCheck, UserX, Clock, MessageCircle, CheckCheck } from 'lucide-react';
import { container } from '@/infrastructure/container';
import { GetDashboardStatsUseCase } from '@/core/use-cases/dashboard/get-dashboard-stats.use-case';
import { EventHeader } from '@/components/events/event-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EvolutionChart, ResponseBreakdownChart } from '@/components/dashboard/charts';

export default async function EventOverviewPage({ params }: { params: { id: string } }) {
  const event = await container.eventRepository.findById(params.id);
  if (!event) notFound();

  const stats = await new GetDashboardStatsUseCase().execute(params.id);

  return (
    <div className="space-y-6">
      <EventHeader event={event} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de convidados" value={stats.totalGuests} icon={Users} accent="primary" />
        <StatCard label="Confirmados" value={stats.confirmed} icon={UserCheck} accent="success" />
        <StatCard label="Recusados" value={stats.declined} icon={UserX} accent="destructive" />
        <StatCard label="Pendentes" value={stats.pending} icon={Clock} accent="warning" />
        <StatCard label="Mensagens enviadas" value={stats.messagesSent} icon={MessageCircle} accent="primary" />
        <StatCard label="Mensagens lidas" value={stats.messagesRead} icon={CheckCheck} accent="primary" />
        <StatCard label="Pessoas confirmadas" value={stats.peopleConfirmed} icon={UserCheck} accent="success" />
        <StatCard label="Taxa de confirmação" value={`${stats.confirmationRate}%`} icon={UserCheck} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução das respostas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.evolutionByDay.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ainda não há respostas registradas.</p>
            ) : (
              <EvolutionChart data={stats.evolutionByDay} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.responseBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponseBreakdownChart data={stats.responseBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
