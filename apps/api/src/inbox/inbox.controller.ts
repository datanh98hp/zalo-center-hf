import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthRequest } from '../auth/auth.types';
import { OutboundQueueService } from '../outbox/outbound-queue.service';

class PaginationQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) before?: string;
}
class SendMessageDto { @IsString() @MinLength(1) @MaxLength(2000) text!: string; }

@Controller('inbox')
@UseGuards(AuthGuard)
export class InboxController {
  constructor(private readonly prisma: PrismaService, private readonly outbound: OutboundQueueService) {}

  @Get('conversations')
  async conversations(@Req() req: AuthRequest, @Query() query: PaginationQuery) {
    return this.prisma.conversation.findMany({
      where: { contact: { tenantId: req.user!.tenantId, ...(req.user!.role === 'AGENT' ? { assignments: { some: { userId: req.user!.sub, active: true } } } : {}) } },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            identifiers: { select: { type: true, value: true } },
            assignments: {
              where: { active: true },
              include: { user: { select: { id: true, displayName: true } } },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        integration: { select: { id: true, kind: true, displayName: true, isActive: true, lastError: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: query.limit,
    });
  }

  @Get('conversations/:id/messages')
  async messages(@Req() req: AuthRequest, @Param('id') id: string, @Query() query: PaginationQuery) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId: req.user!.tenantId, ...(req.user!.role === 'AGENT' ? { assignments: { some: { userId: req.user!.sub, active: true } } } : {}) } }, select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const cursor = query.before
      ? await this.prisma.message.findFirst({ where: { id: query.before, conversationId: id }, select: { id: true, createdAt: true } })
      : null;
    if (query.before && !cursor) throw new BadRequestException('Invalid pagination cursor');
    const rows = await this.prisma.message.findMany({
      where: { conversationId: id, ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}) },
      orderBy: { createdAt: 'desc' }, take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]?.id : null };
  }

  @Post('conversations/:id/messages')
  async send(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, contact: { tenantId: req.user!.tenantId, ...(req.user!.role === 'AGENT' ? { assignments: { some: { userId: req.user!.sub, active: true } } } : {}) } },
      include: { contact: { include: { identifiers: true } }, integration: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const zaloId = conversation.contact.identifiers.find((i) => i.type === 'ZALO_ID' && i.source === conversation.integrationId)?.normalized
      ?? conversation.contact.identifiers.find((i) => i.type === 'ZALO_ID')?.normalized;
    if (!zaloId) throw new BadRequestException('Contact has no Zalo user ID for this conversation');
    try {
      return await this.outbound.enqueue({ tenantId: req.user!.tenantId, integrationId: conversation.integrationId, conversationId: id, recipientId: zaloId, text: dto.text.trim() });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unable to queue message');
    }
  }
}
