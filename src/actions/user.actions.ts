'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/container';
import { createUserSchema } from '@/lib/validations/auth.schema';
import { prisma } from '@/infrastructure/database/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Apenas administradores podem gerenciar usuários');
  return session;
}

export async function listUsersAction() {
  await requireAdmin();
  return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role') || 'OPERATOR',
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const existing = await container.userRepository.findByEmail(parsed.data.email.toLowerCase());
  if (existing) return { success: false, message: 'Já existe um usuário com esse e-mail' };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await container.userRepository.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, message: 'Usuário criado com sucesso' };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath('/dashboard/users');
}
