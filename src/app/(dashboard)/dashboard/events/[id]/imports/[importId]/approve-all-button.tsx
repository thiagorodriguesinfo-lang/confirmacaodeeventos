'use client';

import { useTransition } from 'react';
import { approveAllPendingAction } from '@/actions/import.actions';
import { Button } from '@/components/ui/button';

export function ApproveAllButton({ importId, eventId }: { importId: string; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button disabled={isPending} onClick={() => startTransition(() => approveAllPendingAction(importId, eventId))}>
      {isPending ? 'Aprovando...' : 'Aprovar todos os pendentes'}
    </Button>
  );
}
