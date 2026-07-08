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
import { cooldownMs, jitteredIntervalMs, shouldTakeCooldown, sleep } from '@/core/services/rate-limited-queue.service';
import { container } from '@/infrastructure/container';
import { RouteIncomingMessageUseCase } from '@/core/use-cases/chatbot/route-incoming-message.use-case';
import { BaileysProvider } from '@/infrastructure/whatsapp/baileys.provider';
import { getBaileysStatus } from '@/infrastructure/whatsapp/baileys-runtime';
import {
  startBaileysHost,
  forceBaileysConnect,
  logoutBaileys,
} from '@/infrastructure/whatsapp/baileys-connection.manager';
import type { InboundMessage } from '@/infrastructure/whatsapp/whatsapp-provider.interface';

const POLL_INTERVAL_MS = 5_000;
const BAILEYS_LOOP_MS = 3_000;

async function processJob(jobId: string) {
  const whatsapp = await getWhatsappProvider();

  await prisma.dispatchJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  let sentInBatch = 0;

  while (true) {
    const job = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: jobId } });

    if (job.status === 'PAUSED' || job.status === 'CANCELLED') {
      console.log(`[dispatch-worker] job ${jobId} ${job.status.toLowerCase()}, parando`);
      return;
    }

    // O WhatsApp embutido (Baileys) pode cair no meio do disparo (numero
    // desconectado/banido). Continuar enviando as cegas so pioraria a
    // situacao (mensagens ficariam presas na fila de saida sem o admin
    // perceber) — pausa o job e avisa, em vez de seguir "no escuro".
    if (whatsapp.name === 'baileys' && getBaileysStatus() !== 'connected') {
      await prisma.dispatchJob.update({ where: { id: jobId }, data: { status: 'PAUSED' } });
      await notifyDispatchPaused(job.eventId, job.id);
      console.log(`[dispatch-worker] job ${jobId} pausado: WhatsApp (Baileys) desconectado`);
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

    sentInBatch += 1;
    await sleep(jitteredIntervalMs(job.ratePerMinute));

    if (shouldTakeCooldown(sentInBatch)) {
      console.log(`[dispatch-worker] job ${jobId} pausa de resfriamento apos ${sentInBatch} envios`);
      await sleep(cooldownMs());
    }
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

async function notifyDispatchPaused(eventId: string, dispatchJobId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  await prisma.notification.create({
    data: {
      userId: event.ownerId,
      eventId,
      type: 'DISPATCH_PAUSED',
      title: 'Disparo pausado — WhatsApp desconectado',
      message: `O disparo de convites para "${event.name}" foi pausado automaticamente porque o WhatsApp desconectou. Reconecte e retome o disparo pelo painel.`,
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

// ---------------------------------------------------------------------------
// Baileys embutido — este worker e o UNICO dono do socket do WhatsApp.
// Recebe mensagens (chatbot/importacao), executa comandos do painel
// (conectar/desconectar) e drena a fila de saida do processo web.
// ---------------------------------------------------------------------------

/** Roteia toda mensagem recebida pelo socket para o chatbot/importacao. */
async function routeInbound(message: InboundMessage) {
  const router = new RouteIncomingMessageUseCase(
    container.guestRepository,
    container.conversationRepository,
    container.messageRepository,
    container.importRepository,
    new BaileysProvider(),
  );
  await router.execute(message);
}

/** Executa o pedido do painel (gravado em whatsapp_settings.baileysCommand). */
async function processBaileysCommand(command: string | null) {
  if (command === 'connect') {
    await forceBaileysConnect();
  } else if (command === 'disconnect') {
    await logoutBaileys();
  } else {
    return;
  }
  await prisma.whatsappSettings.update({ where: { id: 'singleton' }, data: { baileysCommand: null } });
}

/** Envia as mensagens que o processo web deixou na fila (BaileysOutbox). */
async function drainOutbox() {
  if (getBaileysStatus() !== 'connected') return;
  const provider = new BaileysProvider();
  const pending = await prisma.baileysOutbox.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 });

  for (const row of pending) {
    try {
      const res = row.imageUrl
        ? await provider.sendImage({ to: row.to, imageUrl: row.imageUrl, caption: row.caption ?? undefined })
        : await provider.sendText({ to: row.to, message: row.text ?? '' });

      // Se o socket caiu no meio, o provider re-enfileira (id "outbox:..."): desfaz
      // a duplicata e para — tenta de novo no proximo ciclo, quando reconectar.
      if (res.providerMessageId.startsWith('outbox:')) {
        await prisma.baileysOutbox.delete({ where: { id: res.providerMessageId.slice(7) } }).catch(() => {});
        break;
      }

      await prisma.baileysOutbox.update({
        where: { id: row.id },
        data: { status: 'SENT', providerMessageId: res.providerMessageId, sentAt: new Date() },
      });
    } catch (error) {
      await prisma.baileysOutbox.update({
        where: { id: row.id },
        data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Erro desconhecido' },
      });
    }
    await sleep(1_500); // pequeno intervalo entre envios da fila
  }
}

async function baileysLoop() {
  let hostStarted = false;
  while (true) {
    try {
      const settings = await prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
      if (settings?.provider === 'baileys') {
        if (!hostStarted) {
          await startBaileysHost({ onInbound: routeInbound });
          hostStarted = true;
          console.log('[dispatch-worker] Baileys host iniciado');
        }
        await processBaileysCommand(settings.baileysCommand);
        await drainOutbox();
      }
      // ponytail: trocar de provider em runtime exige reiniciar o worker (raro).
    } catch (error) {
      console.error('[dispatch-worker] erro no loop do Baileys:', error);
    }
    await sleep(BAILEYS_LOOP_MS);
  }
}

pollLoop();
baileysLoop();
