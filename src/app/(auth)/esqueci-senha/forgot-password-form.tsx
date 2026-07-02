'use client';

import { useState, useTransition } from 'react';
import { requestPasswordResetAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestPasswordResetAction(formData);
      setFeedback(result.message);
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="voce@exemplo.com" required />
          </div>
          {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
