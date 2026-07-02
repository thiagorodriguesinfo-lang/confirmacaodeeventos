'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-none">{name}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <Badge variant={role === 'ADMIN' ? 'default' : 'secondary'}>{role === 'ADMIN' ? 'Admin' : 'Operador'}</Badge>
      <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })} aria-label="Sair">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
