import {
  Body, ConflictException, Controller, Headers, HttpCode, Post, UnauthorizedException, Req,
} from '@nestjs/common';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentService } from '../assignments/assignment.service';
import { ContactLookupService } from '../contacts/contact-lookup.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { encryptJson, decryptJson } from '../integrations/secret-box';

class AssignContactDto {
  @IsString() @MinLength(1) @MaxLength(100) tenantId!: string;
  @IsOptional() @IsString() @MaxLength(100) contactId?: string;
  @IsOptional() @IsString() @MaxLength(200) zaloId?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsString() @MinLength(1) @MaxLength(100) employeeId!: string;
  @IsOptional() @IsString() @MaxLength(100) assignedBy?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
type RawRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly assignments: AssignmentService,
    private readonly prisma: PrismaService,
    private readonly contactLookup: ContactLookupService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private verify(raw: Buffer, signature: string | undefined, secret: string) {
    if (!signature) throw new UnauthorizedException('Missing X-ZC-Signature');
    const expected = createHmac('sha256', secret).update(raw).digest();
    const supplied = signature.replace(/^sha256=/, '');
    if (!/^[a-f0-9]{64}$/i.test(supplied)) throw new UnauthorizedException('Invalid signature');
    const actual = Buffer.from(supplied, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new UnauthorizedException('Invalid signature');
  }

  @Post('assign-contact')
  @HttpCode(202)
  async assignContact(
    @Body() body: AssignContactDto,
    @Req() req: RawRequest,
    @Headers('x-zc-signature') signature?: string,
    @Headers('x-zc-webhook-key') webhookKey?: string,
    @Headers('idempotency-key') key?: string,
  ) {
    const raw = req.rawBody;
    if (!raw) throw new UnauthorizedException('Raw request body is required for signature verification');
    if (!webhookKey) throw new UnauthorizedException('Missing X-ZC-Webhook-Key');
    const keyHash = createHash('sha256').update(webhookKey).digest('hex');
    const credential = await this.prisma.tenantWebhookCredential.findFirst({ where: { tenantId: body.tenantId, keyHash, revokedAt: null } });
    if (!credential) throw new UnauthorizedException('Invalid or revoked workspace webhook key');
    const secret = decryptJson<{ secret: string }>(credential.keyEncrypted).secret;
    this.verify(raw, signature, secret);
    if (!key || key.length > 200) throw new ConflictException('Idempotency-Key header is required (max 200 chars)');
    const requestHash = createHash('sha256').update(raw).digest('hex');

    let outcome: { response: unknown; replayed?: boolean; event: null | { tenantId: string; assignment: { id: string; contactId: string; employeeId: string; label: string; createdAt: Date } } };
    try {
      outcome = await this.prisma.$transaction(async (tx) => {
      // PostgreSQL advisory transaction lock serializes requests with the same tenant/key.
      const lockName = `${body.tenantId}:${key}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockName}, 0))`;
      const existing = await tx.webhookEvent.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: body.tenantId, idempotencyKey: key } },
      });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new ConflictException('Idempotency key reused with a different request');
        }
        if (existing.status === 'PROCESSED' && existing.response) {
          return { response: existing.response, replayed: true, event: null as null };
        }
        if (existing.status === 'PROCESSING') {
          throw new ConflictException('This idempotency key is currently processing; retry shortly');
        }
        await tx.webhookEvent.update({ where: { id: existing.id }, data: { status: 'PROCESSING', response: Prisma.DbNull } });
      } else {
        await tx.webhookEvent.create({
          data: {
            tenantId: body.tenantId, idempotencyKey: key, eventType: 'contact.assign',
            requestHash, status: 'PROCESSING',
          },
        });
      }

      const contact = await this.contactLookup.resolve({
        tenantId: body.tenantId, contactId: body.contactId, zaloId: body.zaloId, phone: body.phone,
      });
      const assignment = await this.assignments.assignInTransaction(tx, {
        tenantId: body.tenantId, contactId: contact.id, employeeId: body.employeeId,
        assignedBy: body.assignedBy, reason: body.reason,
      });
      const response = { accepted: true, replayed: false, assignment: { ...assignment, createdAt: assignment.createdAt.toISOString() } };
      const event = await tx.webhookEvent.update({
        where: { tenantId_idempotencyKey: { tenantId: body.tenantId, idempotencyKey: key } },
        data: { status: 'PROCESSED', response, processedAt: new Date() },
      });
      return { response, replayed: false, event: { tenantId: body.tenantId, assignment } };
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2002' || code === 'P2034') {
        throw new ConflictException('A concurrent update occurred; retry with the same Idempotency-Key');
      }
      throw error;
    }

    if (outcome.event) {
      this.realtime.publishTenantEvent(outcome.event.tenantId, 'assignment.updated', {
        ...outcome.event.assignment,
      });
    }
    return outcome.response;
  }
}
