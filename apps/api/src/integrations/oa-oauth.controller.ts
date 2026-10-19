import { Controller, Get, Query, Req, Res, BadRequestException, ForbiddenException, UseGuards } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';
import { ZaloOaProvider } from './zalo-oa.provider';

@Controller('integrations/oa-oauth')
export class OaOAuthController {
  private readonly provider = new ZaloOaProvider();
  constructor(private readonly prisma: PrismaService) {}

  @Get('start')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async start(@Req() req: AuthRequest, @Query('integrationId') integrationId: string) {
    const appId = process.env.ZALO_OA_APP_ID;
    const redirectUri = process.env.ZALO_OA_REDIRECT_URI ?? `${process.env.PUBLIC_API_URL}/api/integrations/oa-oauth/callback`;
    if (!appId || !process.env.ZALO_OA_APP_SECRET || !redirectUri.startsWith('https://')) {
      throw new BadRequestException('Configure ZALO_OA_APP_ID, ZALO_OA_APP_SECRET and HTTPS ZALO_OA_REDIRECT_URI first');
    }
    const integration = await this.prisma.integration.findFirst({ where: { id: integrationId, tenantId: req.user!.tenantId, kind: 'ZALO_OA' } });
    if (!integration) throw new BadRequestException('Zalo OA integration not found in this workspace');
    const rawState = randomBytes(32).toString('base64url');
    await this.prisma.oAuthState.create({ data: {
      stateHash: createHash('sha256').update(rawState).digest('hex'), tenantId: req.user!.tenantId,
      integrationId, expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    } });
    return { authorizeUrl: this.provider.authorizeUrl({ appId, redirectUri, state: rawState }), expiresIn: 600 };
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Query('error') error?: string) {
    if (error) throw new BadRequestException(`Zalo authorization was declined (${error})`);
    if (!code || !state) throw new BadRequestException('Missing authorization code or state');
    const stateHash = createHash('sha256').update(state).digest('hex');
    const stateRow = await this.prisma.oAuthState.findUnique({ where: { stateHash } });
    if (!stateRow || stateRow.consumedAt || stateRow.expiresAt < new Date()) throw new ForbiddenException('Invalid, expired, or already used OAuth state');
    const appId = process.env.ZALO_OA_APP_ID!;
    const appSecret = process.env.ZALO_OA_APP_SECRET!;
    const claimed = await this.prisma.oAuthState.updateMany({ where: { id: stateRow.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (claimed.count !== 1) throw new ForbiddenException('OAuth state has already been consumed');
    const credentials = await this.provider.exchangeCode({ appId, appSecret, code });
    await this.prisma.integration.update({ where: { id: stateRow.integrationId }, data: {
      encryptedAuth: ZaloOaProvider.encodeCredentials(credentials), isActive: true,
      tokenExpiresAt: new Date(credentials.expiresAt), lastError: null,
    } });
    return { connected: true, message: 'Zalo OA connected. You may close this tab and return to Zalo Center.' };
  }
}
