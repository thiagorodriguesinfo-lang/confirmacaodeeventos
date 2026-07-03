'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, PartyPopper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNav } from './sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card md:hidden">
          <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
          <div className="flex h-16 items-center justify-between gap-2 border-b px-6">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              <span className="font-semibold">ConfirmaEventos</span>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
