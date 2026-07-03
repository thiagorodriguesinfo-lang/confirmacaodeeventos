'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { createGuestViaStaffTokenAction } from '@/actions/staff.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function StaffAddGuestForm({ staffToken }: { staffToken: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" />
        Adicionar novo convidado
      </Button>
    );
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createGuestViaStaffTokenAction(staffToken, formData);
      setFeedback(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <p className="font-medium">Novo convidado</p>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form ref={formRef} action={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input name="phone" placeholder="(21) 99999-9999" required />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar convidado'}
          </Button>
        </form>
        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
      </CardContent>
    </Card>
  );
}
