import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';

class AuditQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MANAGER')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query() query: AuditQuery) {
    return this.prisma.auditLog.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
  }
}
