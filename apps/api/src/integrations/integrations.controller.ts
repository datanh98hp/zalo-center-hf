import {
  Body, BadRequestException, ConflictException, Controller, Get, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { IntegrationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';

class CreateIntegrationDto {
  @IsEnum(IntegrationKind) kind!: IntegrationKind;
  @IsString() @MinLength(1) @MaxLength(120) displayName!: string;
  @IsString() @MinLength(1) @MaxLength(200) externalId!: string;
}

@Controller('integrations')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MANAGER')
export class IntegrationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.prisma.integration.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true, kind: true, displayName: true, externalId: true, isActive: true, lastSyncedAt: true, lastError: true, tokenExpiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(@Body() dto: CreateIntegrationDto, @Req() req: AuthRequest) {
    if (dto.kind === IntegrationKind.ZALO_PERSONAL_APPROVED) {
      throw new BadRequestException(
        'Personal Zalo QR integration is not implemented. Verify an authorized provider and deploy its adapter before enabling this integration.',
      );
    }
    const tenantId = req.user!.tenantId;
    try {
      return await this.prisma.integration.create({
        data: { tenantId, kind: dto.kind, displayName: dto.displayName.trim(), externalId: dto.externalId.trim(), isActive: false },
        select: { id: true, kind: true, displayName: true, externalId: true, isActive: true, lastError: true, createdAt: true },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('This external account is already registered in this workspace');
      }
      throw error;
    }
  }
}
