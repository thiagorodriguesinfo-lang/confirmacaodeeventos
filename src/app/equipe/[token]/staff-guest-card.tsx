'use client';

import { manuallyConfirmGuestViaStaffTokenAction } from '@/actions/staff.actions';
import { ConfirmationDialog } from '@/components/guests/confirmation-dialog';
import { GuestStatusBadge } from '@/components/dashboard/guest-status-badge';
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

        <ConfirmationDialog
          guestName={guest.name}
          initialStatus={guest.status}
          initialCompanions={guest.companions}
          triggerLabel={guest.status === 'CONFIRMED' || guest.status === 'DECLINED' ? 'Editar' : 'Confirmar'}
          onSubmit={(input) => manuallyConfirmGuestViaStaffTokenAction(staffToken, guest.id, input)}
        />
      </CardContent>
    </Card>
  );
}
