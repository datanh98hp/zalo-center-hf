import { Controller, Get, Post, Param, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';
import { encryptJson } from '../integrations/secret-box';
@Controller('webhook-credentials')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class WebhookCredentialsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list(@Req() req: AuthRequest) {
    return this.prisma.tenantWebhookCredential.findMany({ where: { tenantId: req.user!.tenantId }, select: { id: true, label: true, createdAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' } });
  }
  @Post()
  async create(@Req() req: AuthRequest) {
    const secret = randomBytes(48).toString('base64url');
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const row = await this.prisma.tenantWebhookCredential.create({ data: {
      tenantId: req.user!.tenantId, keyHash, keyEncrypted: encryptJson({ secret }), label: `Webhook key ${new Date().toISOString()}`,
    }, select: { id: true, label: true, createdAt: true } });
    // The raw key is returned once only; subsequent list calls never expose it.
    return { ...row, secret, warning: 'Copy this key now. It cannot be retrieved later.' };
  }
  @Post(':id/revoke')
  async revoke(@Req() req: AuthRequest, @Param('id') id: string) {
    const result = await this.prisma.tenantWebhookCredential.updateMany({ where: { id, tenantId: req.user!.tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException('Active webhook credential not found');
    return { revoked: true };
  }
}
