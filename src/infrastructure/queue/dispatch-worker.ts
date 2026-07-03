/**
 * Worker de disparo em lote (Modulo 4).
 *
 * Processo Node de longa duracao (rodado via `npm run worker:dispatch`,
 * tipicamente em um container Docker separado) que:
 *   1. Poll periodico por DispatchJobs com status QUEUED.
 *   2. Envia mensagens respeitando o rate limit configurado (msgs/min).
 *   3. Verifica o status do job a cada envio — permite pausar/cancelar
 *      a qualquer momento a partir do painel administrativo.
 *   4. Atualiza progresso (sentCount/failedCount) em tempo real.
 *
 * Nao roda dentro das Server Actions/API Routes do Next.js porque disparos
 * de milhares de convidados excedem o timeout de funcoes serverless.
 */
import { prisma } from '@/infrastructure/database/prisma';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';
import { renderTemplate } from '@/core/services/message-template.service';
import { intervalMsForRate, sleep } from '@/core/services/rate-limited-queue.service';

const POLL_INTERVAL_MS = 5_000;

async function processJob(jobId: string) {
  const whatsapp = await getWhatsappProvider();

  await prisma.dispatchJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  while (true) {
    const job = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: jobId } });

    if (job.status === 'PAUSED' || job.status === 'CANCELLED') {
      console.log(`[dispatch-worker] job ${jobId} ${job.status.toLowerCase()}, parando`);
      return;
    }

    const nextTarget = await prisma.dispatchTarget.findFirst({
      where: { dispatchJobId: jobId, sent: false },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextTarget) {
      await prisma.dispatchJob.update({ where: { id: jobId }, data: { status: 'COMPLETED', finishedAt: new Date() } });
      await notifyDispatchCompleted(job.eventId, job.id);
      console.log(`[dispatch-worker] job ${jobId} concluido`);
      return;
    }

    const guest = await prisma.guest.findUnique({ where: { id: nextTarget.guestId }, include: { event: true } });

    if (!guest) {
      await prisma.dispatchTarget.update({ where: { id: nextTarget.id }, data: { sent: true, errorMessage: 'Convidado removido' } });
      continue;
    }

    try {
      const vars = {
        nome: guest.name,
        evento: guest.event.name,
        data: guest.event.date.toLocaleDateString('pt-BR'),
        hora: guest.event.time,
        local: guest.event.location,
        maps: guest.event.googleMapsUrl ?? '',
        link: `${process.env.NEXT_PUBLIC_APP_URL}/convite/${guest.event.publicToken}/${guest.id}`,
      };
      const text = renderTemplate(guest.event.defaultMessage, vars);

      const result = guest.event.invitationImage
        ? await whatsapp.sendImage({ to: guest.phone, imageUrl: guest.event.invitationImage, caption: text })
        : await whatsapp.sendText({ to: guest.phone, message: text });

      await prisma.$transaction([
        prisma.message.create({
          data: {
            guestId: guest.id,
            direction: 'OUTBOUND',
            type: guest.event.invitationImage ? 'IMAGE' : 'TEXT',
            status: 'SENT',
            content: text,
            mediaUrl: guest.event.invitationImage,
            providerMessageId: result.providerMessageId,
            providerName: whatsapp.name,
            sentAt: new Date(),
          },
        }),
        prisma.guest.update({
          where: { id: guest.id },
          data: { status: 'SENT', sentAt: new Date(), chatbotStep: 'AWAITING_CONFIRMATION' },
        }),
        prisma.timelineEvent.create({ data: { guestId: guest.id, type: 'INVITE_SENT', payload: { dispatchJobId: jobId } } }),
        prisma.conversationState.upsert({
          where: { guestId: guest.id },
          update: { currentStep: 'AWAITING_CONFIRMATION', lastMessageAt: new Date() },
          create: { guestId: guest.id, currentStep: 'AWAITING_CONFIRMATION', context: {}, lastMessageAt: new Date() },
        }),
        prisma.dispatchTarget.update({ where: { id: nextTarget.id }, data: { sent: true, sentAt: new Date() } }),
        prisma.dispatchJob.update({ where: { id: jobId }, data: { sentCount: { increment: 1 } } }),
      ]);
    } catch (error) {
      console.error(`[dispatch-worker] falha ao enviar para ${guest.phone}:`, error);
      await prisma.$transaction([
        prisma.dispatchTarget.update({
          where: { id: nextTarget.id },
          data: { sent: true, errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' },
        }),
        prisma.dispatchJob.update({ where: { id: jobId }, data: { failedCount: { increment: 1 } } }),
      ]);
    }

    await sleep(intervalMsForRate(job.ratePerMinute));
  }
}

async function notifyDispatchCompleted(eventId: string, dispatchJobId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  await prisma.notification.create({
    data: {
      userId: event.ownerId,
      eventId,
      type: 'DISPATCH_COMPLETED',
      title: 'Disparo concluído',
      message: `O disparo de convites para "${event.name}" foi concluído.`,
      payload: { dispatchJobId },
    },
  });
}

async function pollLoop() {
  console.log('[dispatch-worker] iniciado, aguardando jobs...');
  while (true) {
    try {
      const queuedJob = await prisma.dispatchJob.findFirst({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' } });
      if (queuedJob) {
        await processJob(queuedJob.id);
      }
    } catch (error) {
      console.error('[dispatch-worker] erro no loop principal:', error);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

pollLoop();
