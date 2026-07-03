'use client';

import { manuallyConfirmGuestAction } from '@/actions/guest.actions';
import { ConfirmationDialog } from '@/components/guests/confirmation-dialog';

export function ManualConfirmDialog({
  guestId,
  eventId,
  guestName,
  initialStatus,
  initialCompanions,
}: {
  guestId: string;
  eventId: string;
  guestName: string;
  initialStatus: string;
  initialCompanions: { name: string; age: number | null }[];
}) {
  return (
    <ConfirmationDialog
      guestName={guestName}
      initialStatus={initialStatus}
      initialCompanions={initialCompanions}
      onSubmit={(input) => manuallyConfirmGuestAction(guestId, eventId, input)}
    />
  );
}
