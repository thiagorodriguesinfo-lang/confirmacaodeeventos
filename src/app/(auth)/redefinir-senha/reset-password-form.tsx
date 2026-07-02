'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetPasswordAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      setFeedback(result.message);
      if (result.success) setTimeout(() => router.push('/login'), 1500);
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
          </div>
          {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
          <Button type="submit" className="w-full" disabled={isPending || !token}>
            {isPending ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
