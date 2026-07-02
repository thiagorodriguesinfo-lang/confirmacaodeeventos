'use server';

import { container } from '@/infrastructure/container';
import { RequestPasswordResetUseCase } from '@/core/use-cases/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/core/use-cases/auth/reset-password.use-case';
import { requestPasswordResetSchema, resetPasswordSchema } from '@/lib/validations/auth.schema';

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { success: false, message: 'E-mail inválido' };

  const useCase = new RequestPasswordResetUseCase(container.userRepository);
  const token = await useCase.execute(parsed.data.email);

  // Em producao, o token deve ser enviado por e-mail (ou WhatsApp) — nunca
  // exposto na resposta. Aqui apenas logamos para fins de desenvolvimento.
  if (token) {
    console.log(`[password-reset] link: ${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token}`);
  }

  return { success: true, message: 'Se o e-mail existir em nossa base, um link de redefinição foi enviado.' };
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const useCase = new ResetPasswordUseCase(container.userRepository);
    await useCase.execute(parsed.data.token, parsed.data.password);
    return { success: true, message: 'Senha redefinida com sucesso. Você já pode entrar.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao redefinir senha' };
  }
}
