'use client';

import { useTransition } from 'react';
import { toggleUserActiveAction } from '@/actions/user.actions';
import { Button } from '@/components/ui/button';

export function ToggleUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => toggleUserActiveAction(userId, !isActive))}
    >
      {isActive ? 'Desativar' : 'Ativar'}
    </Button>
  );
}
