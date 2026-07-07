'use server';

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — suficiente para uma imagem de convite, leve o bastante para o envio via WhatsApp

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Upload da imagem do convite, guardada em disco sob `public/uploads/invitations`
 * (em produção, um volume Docker montado nesse caminho — ver docker-compose.yml).
 * O Next.js standalone já serve tudo em `public/` como arquivo estatico, entao a
 * URL retornada (relativa) fica acessivel sem nenhuma rota extra.
 *
 * Retorna um caminho RELATIVO — quem chama deve prefixar com a origem atual
 * (window.location.origin) antes de salvar no evento, ja que os provedores de
 * WhatsApp buscam essa URL diretamente e precisam de um endereco publico
 * absoluto (NEXT_PUBLIC_APP_URL pode estar desatualizado em deploys por IP).
 */
export async function uploadInvitationImageAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false as const, message: 'Não autenticado' };

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { success: false as const, message: 'Selecione uma imagem' };

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { success: false as const, message: 'Formato inválido — use JPG, PNG ou WebP' };
  if (file.size > MAX_SIZE_BYTES) return { success: false as const, message: 'Imagem muito grande (máximo 5MB)' };

  const fileName = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'invitations');
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  return { success: true as const, url: `/uploads/invitations/${fileName}` };
}
