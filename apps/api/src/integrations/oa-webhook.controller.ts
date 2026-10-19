import { Controller, Headers, HttpCode, Param, Post, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ZaloOaProvider } from './zalo-oa.provider';

type RawReq = Request & { rawBody?: Buffer };
@Controller('webhooks/zalo-oa')
export class OaWebhookController {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}
  @Post(':integrationId')
  @HttpCode(200)
  async receive(@Param('integrationId') integrationId: string, @Req() req: RawReq, @Headers('x-zevent-signature') signature?: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id: integrationId, kind: 'ZALO_OA', isActive: true } });
    if (!integration?.encryptedAuth) throw new UnauthorizedException('Unknown or inactive integration');
    const credentials = ZaloOaProvider.decodeCredentials(integration.encryptedAuth);
    const raw = req.rawBody;
    if (!raw) throw new UnauthorizedException('Raw request body is required for signature verification');
    if (!new ZaloOaProvider().verifyWebhook(raw, signature, credentials.appSecret)) throw new UnauthorizedException('Invalid Zalo OA webhook signature');
    const event = req.body as Record<string, unknown>;
    const eventName = String(event.event_name ?? '');
    const sender = event.sender as Record<string, unknown> | undefined;
    const recipient = event.recipient as Record<string, unknown> | undefined;
    const message = event.message as Record<string, unknown> | undefined;
    if (!eventName) throw new BadRequestException('Missing event_name');
    // Status event handling is deliberately conservative: update only when the provider
    // event contains a known message identifier and an explicit terminal status.
    const providerMessageId = String(message?.msg_id ?? message?.message_id ?? event.message_id ?? '');
    const providerStatus = String(event.status ?? message?.status ?? '').toLowerCase();
    if (providerMessageId && (eventName.toLowerCase().includes('status') || eventName.toLowerCase().includes('delivery')) && ['delivered', 'success', 'failed', 'error'].includes(providerStatus)) {
      const terminal = ['delivered', 'success'].includes(providerStatus) ? 'DELIVERED' : 'FAILED';
      const job = await this.prisma.outboundJob.findFirst({ where: { integrationId, providerMessageId } });
      if (job) {
        await this.prisma.$transaction([
          this.prisma.message.update({ where: { id: job.messageId }, data: { status: terminal } }),
          this.prisma.outboundJob.update({ where: { id: job.id }, data: { status: terminal } }),
          this.prisma.outboxEvent.create({ data: { tenantId: integration.tenantId, integrationId, eventType: 'message.status', aggregateId: job.messageId, payload: { messageId: job.messageId, conversationId: job.conversationId, status: terminal } } }),
        ]);
      }
      return { received: true, statusUpdated: Boolean(job) };
    }
    if (!eventName.includes('user_send_text') && !eventName.includes('user_send_image') && !eventName.includes('user_send_file')) {
      await this.prisma.webhookEvent.create({ data: { tenantId: integration.tenantId, idempotencyKey: `zalo:${integrationId}:${String(event.app_id ?? '')}:${String(event.timestamp ?? Date.now())}:${eventName}`, eventType: eventName, requestHash: 'verified-provider-event', status: 'IGNORED', response: { eventName }, processedAt: new Date() } }).catch(() => undefined);
      return { received: true, ignored: true };
    }
    const senderId = String(sender?.id ?? '');
    const messageId = String(message?.msg_id ?? message?.message_id ?? `${eventName}:${String(event.timestamp ?? Date.now())}`);
    if (!senderId) throw new BadRequestException('Missing sender.id');
    const result = await this.prisma.$transaction(async (tx) => {
      const key = `zalo:${integrationId}:${messageId}`;
      const hash = `${eventName}:${senderId}:${String(message?.text ?? '')}`;
      const prior = await tx.webhookEvent.findFirst({ where: { tenantId: integration.tenantId, idempotencyKey: key } });
      if (prior) return { duplicate: true, conversationId: null as string | null, messageId: null as string | null };
      await tx.webhookEvent.create({ data: { tenantId: integration.tenantId, idempotencyKey: key, eventType: eventName, requestHash: hash, status: 'PROCESSING' } });
      let identifier = await tx.contactIdentifier.findFirst({ where: { tenantId: integration.tenantId, type: 'ZALO_ID', normalized: senderId }, include: { contact: true } });
      let contact = identifier?.contact;
      if (!contact) {
        contact = await tx.contact.create({ data: { tenantId: integration.tenantId, displayName: String(sender?.name ?? '') || null, identifiers: { create: { tenantId: integration.tenantId, type: 'ZALO_ID', value: senderId, normalized: senderId, source: integration.id } } } });
      }
      const externalConversationId = String(senderId);
      let conversation = await tx.conversation.findFirst({ where: { integrationId: integration.id, externalId: externalConversationId } });
      if (!conversation) conversation = await tx.conversation.create({ data: { contactId: contact.id, integrationId: integration.id, externalId: externalConversationId } });
      const text = typeof message?.text === 'string' ? message.text : null;
      const saved = await tx.message.create({ data: { conversationId: conversation.id, externalId: messageId, direction: 'INBOUND', status: 'RECEIVED', text, payload: event as import('@prisma/client').Prisma.InputJsonValue, receivedAt: (() => { const stamp = Number(event.timestamp ?? Date.now()); return new Date(stamp > 100000000000 ? stamp : stamp > 0 ? stamp * 1000 : Date.now()); })() } });
      await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
      await tx.webhookEvent.update({ where: { tenantId_idempotencyKey: { tenantId: integration.tenantId, idempotencyKey: key } }, data: { status: 'PROCESSED', processedAt: new Date(), response: { messageId: saved.id, conversationId: conversation.id } } });
      await tx.outboxEvent.create({ data: { tenantId: integration.tenantId, integrationId: integration.id, eventType: 'message.created', aggregateId: saved.id, payload: { conversationId: conversation.id, messageId: saved.id, contactId: contact.id } } });
      return { duplicate: false, conversationId: conversation.id, messageId: saved.id };
    });
    await this.prisma.integration.update({ where: { id: integration.id }, data: { lastSyncedAt: new Date(), lastError: null } });
    return { received: true, duplicate: result.duplicate };
  }
}
