import { prisma } from '@/infrastructure/database/prisma';

export type DispatchControlAction = 'PAUSE' | 'RESUME' | 'CANCEL';

const TRANSITIONS: Record<DispatchControlAction, { from: string[]; to: 'PAUSED' | 'QUEUED' | 'CANCELLED' }> = {
  PAUSE: { from: ['RUNNING', 'QUEUED'], to: 'PAUSED' },
  RESUME: { from: ['PAUSED'], to: 'QUEUED' },
  CANCEL: { from: ['RUNNING', 'QUEUED', 'PAUSED'], to: 'CANCELLED' },
};

export class ControlDispatchJobUseCase {
  async execute(jobId: string, action: DispatchControlAction) {
    const job = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: jobId } });
    const transition = TRANSITIONS[action];

    if (!transition.from.includes(job.status)) {
      throw new Error(`Nao e possivel ${action} um job com status ${job.status}`);
    }

    return prisma.dispatchJob.update({
      where: { id: jobId },
      data: { status: transition.to, finishedAt: transition.to === 'CANCELLED' ? new Date() : undefined },
    });
  }
}
