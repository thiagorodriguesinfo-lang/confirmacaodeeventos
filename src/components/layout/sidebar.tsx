'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { CalendarDays, LayoutDashboard, Users, Inbox, Send, Settings, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

function useEventNavItems() {
  const params = useParams<{ id?: string }>();
  const eventId = params?.id;

  if (!eventId) return [];

  return [
    { href: `/dashboard/events/${eventId}`, label: 'Visão geral', icon: LayoutDashboard },
    { href: `/dashboard/events/${eventId}/guests`, label: 'Convidados', icon: Users },
    { href: `/dashboard/events/${eventId}/imports`, label: 'Contatos recebidos', icon: Inbox },
    { href: `/dashboard/events/${eventId}/dispatch`, label: 'Disparo', icon: Send },
    { href: `/dashboard/events/${eventId}/settings`, label: 'Configurações', icon: Settings },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const eventNavItems = useEventNavItems();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <PartyPopper className="h-5 w-5 text-primary" />
        <span className="font-semibold">ConfirmaEventos</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
            pathname === '/dashboard' && 'bg-accent text-accent-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Meus eventos
        </Link>

        {eventNavItems.length > 0 && (
          <div className="mt-6 space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evento atual</p>
            {eventNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                  pathname === item.href && 'bg-accent text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
