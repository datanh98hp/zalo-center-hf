import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { verifyToken } from './security';
import { AuthRequest, AuthUser } from './auth.types';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const raw = req.headers.authorization;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : '';
    const secret = process.env.JWT_SECRET;
    if (!secret || !token) throw new UnauthorizedException('Bearer token required');
    const user = verifyToken(token, secret);
    if (!user) throw new UnauthorizedException('Invalid or expired token');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const revoked = await this.prisma.tokenRevocation.findUnique({ where: { tokenHash } });
    if (revoked) throw new UnauthorizedException('Session has been revoked');
    const current = await this.prisma.user.findFirst({ where: { id: user.sub, tenantId: user.tenantId, isActive: true }, select: { role: true } });
    if (!current) throw new UnauthorizedException('User is inactive or no longer exists');
    req.user = { sub: user.sub, tenantId: user.tenantId, role: current.role as AuthUser['role'] };
    (req as AuthRequest & { accessToken?: string }).accessToken = token;
    return true;
  }
}
