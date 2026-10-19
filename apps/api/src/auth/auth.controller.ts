import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { issueToken, verifyPassword } from './security';
import { AuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(1) password!: string; @IsString() @MinLength(1) tenantId!: string; }
@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: AuthRequest) {
    const email = dto.email.toLowerCase().trim();
    const identityHash = createHash('sha256').update(`${dto.tenantId}:${email}:${String(req.ip ?? '')}`).digest('hex');
    const minutes = Math.max(1, Number(process.env.LOGIN_WINDOW_MINUTES ?? 15));
    const limit = Math.max(3, Number(process.env.LOGIN_MAX_ATTEMPTS ?? 10));
    const since = new Date(Date.now() - minutes * 60_000);
    const recentFailures = await this.prisma.loginAttempt.count({ where: { identityHash, succeeded: false, occurredAt: { gte: since } } });
    if (recentFailures >= limit) throw new UnauthorizedException('Too many login attempts. Try again later.');
    const user = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId: dto.tenantId, email } } });
    const valid = !!user && user.isActive && await verifyPassword(dto.password, user.passwordHash);
    await this.prisma.loginAttempt.create({ data: { identityHash, succeeded: Boolean(valid) } });
    if (!valid || !user) throw new UnauthorizedException('Invalid credentials');
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
    const accessToken = issueToken({ sub: user.id, tenantId: user.tenantId, role: user.role }, secret);
    return { accessToken, tokenType: 'Bearer', expiresIn: 3600, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, tenantId: user.tenantId } };
  }
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthRequest) {
    const token = req.accessToken!;
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp: number };
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.tokenRevocation.upsert({ where: { tokenHash }, create: { tokenHash, userId: req.user!.sub, tenantId: req.user!.tenantId, expiresAt: new Date(claims.exp * 1000) }, update: {} });
    return { loggedOut: true };
  }
}
