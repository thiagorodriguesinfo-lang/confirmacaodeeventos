'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { manuallyConfirmGuestViaStaffTokenAction, deleteGuestViaStaffTokenAction } from '@/actions/staff.actions';
import { ConfirmationDialog } from '@/components/guests/confirmation-dialog';
import { GuestStatusBadge } from '@/components/dashboard/guest-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPhone } from '@/lib/utils';

export function StaffGuestCard({
  staffToken,
  guest,
}: {
  staffToken: string;
  guest: {
    id: string;
    name: string;
    phone: string;
    status: string;
    confirmedCount: number;
    companions: { name: string; age: number | null }[];
  };
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover ${guest.name} da lista de convidados?`)) return;
    startTransition(async () => {
      await deleteGuestViaStaffTokenAction(staffToken, guest.id);
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{guest.name}</p>
          <p className="text-sm text-muted-foreground">{formatPhone(guest.phone)}</p>
          <div className="mt-1 flex items-center gap-2">
            <GuestStatusBadge status={guest.status} />
            {guest.status === 'CONFIRMED' && (
              <span className="text-xs text-muted-foreground">
                {guest.confirmedCount} pessoa(s)
                {guest.companions.length > 0 ? ` — ${guest.companions.map((c) => c.name).join(', ')}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ConfirmationDialog
            guestName={guest.name}
            initialStatus={guest.status}
            initialCompanions={guest.companions}
            triggerLabel={guest.status === 'CONFIRMED' || guest.status === 'DECLINED' ? 'Editar' : 'Confirmar'}
            showCompanions={false}
            onSubmit={(input) => manuallyConfirmGuestViaStaffTokenAction(staffToken, guest.id, input)}
          />
          <Button variant="ghost" size="icon" disabled={isPending} onClick={handleDelete} aria-label="Remover convidado">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
