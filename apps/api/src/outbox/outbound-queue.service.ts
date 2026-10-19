import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, MessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ZaloOaProvider } from '../integrations/zalo-oa.provider';

@Injectable()
export class OutboundQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboundQueueService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly provider = new ZaloOaProvider();
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick(), Number(process.env.OUTBOUND_POLL_MS ?? 1500)); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async enqueue(input: { tenantId: string; integrationId: string; conversationId: string; recipientId: string; text: string }) {
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: { id: input.conversationId, integrationId: input.integrationId, contact: { tenantId: input.tenantId } },
        include: { integration: true },
      });
      if (!conversation) throw new Error('Conversation not found in this workspace or integration');
      if (!conversation.integration.isActive || !conversation.integration.encryptedAuth) throw new Error('Integration is not connected');
      if (conversation.integration.kind !== 'ZALO_OA') throw new Error('No approved outbound adapter is configured for this integration kind');
      const message = await tx.message.create({ data: { conversationId: conversation.id, direction: 'OUTBOUND', status: MessageStatus.QUEUED, text: input.text } });
      const job = await tx.outboundJob.create({ data: {
        tenantId: input.tenantId, integrationId: input.integrationId, conversationId: conversation.id,
        messageId: message.id, recipientId: input.recipientId, text: input.text,
      } });
      await tx.outboxEvent.create({ data: {
        tenantId: input.tenantId, integrationId: input.integrationId, eventType: 'message.queued', aggregateId: message.id,
        payload: { conversationId: conversation.id, messageId: message.id, status: 'QUEUED' },
      } });
      return { message, jobId: job.id };
    });
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try { await this.recoverStaleClaims(); await this.processOutbox(); await this.processOneJob(); }
    catch (error) { this.logger.error(`Queue tick failed: ${error instanceof Error ? error.message : 'unknown error'}`); }
    finally { this.running = false; }
  }

  private async recoverStaleClaims() {
    const cutoff = new Date(Date.now() - 2 * 60_000);
    await this.prisma.outboundJob.updateMany({
      where: { status: 'PROCESSING', lockedAt: { lt: cutoff } },
      data: { status: 'QUEUED', lockedAt: null, availableAt: new Date(), lastError: 'Recovered stale worker claim' },
    });
    await this.prisma.outboxEvent.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: cutoff } },
      data: { status: 'PENDING', availableAt: new Date(), lastError: 'Recovered stale outbox claim' },
    });
  }

  private async processOutbox() {
    const events = await this.prisma.outboxEvent.findMany({ where: { status: 'PENDING', availableAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: 50 });
    for (const event of events) {
      const claimed = await this.prisma.outboxEvent.updateMany({ where: { id: event.id, status: 'PENDING' }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        const payload = event.payload as { conversationId?: string; messageId?: string; status?: string };
        this.realtime.publishTenantEvent(event.tenantId, event.eventType, payload);
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } });
      } catch (error) {
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: event.attempts >= 8 ? 'DEAD' : 'PENDING', availableAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** event.attempts)), lastError: safeError(error) } });
      }
    }
  }

  private async processOneJob() {
    const now = new Date();
    const candidates = await this.prisma.outboundJob.findMany({ where: { status: 'QUEUED', availableAt: { lte: now } }, orderBy: { createdAt: 'asc' }, take: 10 });
    for (const job of candidates) {
      const claimed = await this.prisma.outboundJob.updateMany({ where: { id: job.id, status: 'QUEUED' }, data: { status: 'PROCESSING', lockedAt: now, attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        const integration = await this.prisma.integration.findFirst({ where: { id: job.integrationId, tenantId: job.tenantId } });
        if (!integration?.encryptedAuth || integration.kind !== 'ZALO_OA' || !integration.isActive) throw new Error('Integration is disconnected or has no supported adapter');
        let credentials = ZaloOaProvider.decodeCredentials(integration.encryptedAuth);
        if (credentials.expiresAt && credentials.expiresAt < Date.now() + 60000) {
          credentials = await this.provider.refresh(credentials);
          await this.prisma.integration.update({ where: { id: integration.id }, data: { encryptedAuth: ZaloOaProvider.encodeCredentials(credentials), tokenExpiresAt: new Date(credentials.expiresAt), lastError: null } });
        }
        const sent = await this.provider.sendText(credentials, job.recipientId, job.text);
        await this.prisma.$transaction([
          this.prisma.message.update({ where: { id: job.messageId }, data: { status: MessageStatus.SENT, sentAt: new Date(), externalId: sent.messageId || undefined } }),
          this.prisma.outboundJob.update({ where: { id: job.id }, data: { status: 'SENT', providerMessageId: sent.messageId || null, lockedAt: null, lastError: null } }),
          this.prisma.outboxEvent.create({ data: { tenantId: job.tenantId, integrationId: job.integrationId, eventType: 'message.status', aggregateId: job.messageId, payload: { messageId: job.messageId, conversationId: job.conversationId, status: 'SENT' } } }),
        ]);
        break;
      } catch (error) {
        const message = safeError(error);
        const dead = job.attempts + 1 >= job.maxAttempts;
        const delay = Math.min(3600000, 1000 * 2 ** Math.min(job.attempts, 10));
        await this.prisma.$transaction([
          this.prisma.outboundJob.update({ where: { id: job.id }, data: { status: dead ? 'DEAD' : 'QUEUED', availableAt: new Date(Date.now() + delay), lockedAt: null, lastError: message } }),
          this.prisma.message.update({ where: { id: job.messageId }, data: { status: dead ? MessageStatus.FAILED : MessageStatus.QUEUED } }),
          this.prisma.integration.update({ where: { id: job.integrationId }, data: { lastError: message.slice(0, 500) } }),
          this.prisma.outboxEvent.create({ data: { tenantId: job.tenantId, integrationId: job.integrationId, eventType: dead ? 'message.dead_letter' : 'message.retry_scheduled', aggregateId: job.messageId, payload: { messageId: job.messageId, conversationId: job.conversationId, status: dead ? 'FAILED' : 'QUEUED', attempt: job.attempts + 1, error: message } } }),
        ]);
        if (dead) this.logger.error(`Outbound job ${job.id} moved to dead-letter after ${job.attempts + 1} attempts`);
      }
    }
  }
}
function safeError(error: unknown): string { return (error instanceof Error ? error.message : 'Unknown provider error').replace(/access_token|refresh_token|secret_key/gi, '[REDACTED]').slice(0, 500); }
