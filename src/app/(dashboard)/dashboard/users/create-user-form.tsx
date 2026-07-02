'use client';

import { useRef, useState, useTransition } from 'react';
import { createUserAction } from '@/actions/user.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateUserForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createUserAction(formData);
      setFeedback(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px] flex-1 space-y-1">
        <Label>Nome</Label>
        <Input name="name" required />
      </div>
      <div className="min-w-[200px] flex-1 space-y-1">
        <Label>E-mail</Label>
        <Input name="email" type="email" required />
      </div>
      <div className="min-w-[160px] space-y-1">
        <Label>Senha</Label>
        <Input name="password" type="password" minLength={6} required />
      </div>
      <div className="space-y-1">
        <Label>Papel</Label>
        <select name="role" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="OPERATOR">
          <option value="OPERATOR">Operador</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Criando...' : 'Criar usuário'}
      </Button>
      {feedback && <p className="w-full text-sm text-muted-foreground">{feedback}</p>}
    </form>
  );
}
