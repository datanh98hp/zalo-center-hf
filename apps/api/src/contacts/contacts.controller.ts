import {
  Body, ConflictException, Controller, Get, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthRequest } from '../auth/auth.types';

class CreateContactDto {
  @IsOptional() @IsString() @MaxLength(200) displayName?: string;
  @IsOptional() @IsString() @MaxLength(200) zaloId?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}

function normalizePhone(value: string): string {
  // Do not guess country codes. Normalize formatting only; callers should supply
  // E.164 when country context is known.
  return value.trim().replace(/[^\d+]/g, '');
}

@Controller('contacts')
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: AuthRequest, @Query('q') q?: string) {
    const tenantId = req.user!.tenantId;
    const search = q?.trim();
    return this.prisma.contact.findMany({
      where: {
        tenantId,
        ...(search ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { identifiers: { some: { tenantId, normalized: { contains: search } } } },
          ],
        } : {}),
      },
      include: {
        identifiers: { select: { id: true, type: true, value: true, normalized: true, source: true } },
        assignments: {
          where: { active: true },
          include: { user: { select: { id: true, displayName: true, email: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  @Post()
  async create(@Body() dto: CreateContactDto, @Req() req: AuthRequest) {
    const tenantId = req.user!.tenantId;
    const identifiers: { type: 'ZALO_ID' | 'PHONE'; value: string; normalized: string; source: string; tenantId: string }[] = [];
    if (dto.zaloId?.trim()) identifiers.push({
      tenantId, type: 'ZALO_ID', value: dto.zaloId.trim(),
      normalized: dto.zaloId.trim(), source: 'manual',
    });
    if (dto.phone?.trim()) {
      const normalized = normalizePhone(dto.phone);
      if (!normalized) throw new ConflictException('Phone number is invalid');
      identifiers.push({ tenantId, type: 'PHONE', value: dto.phone.trim(), normalized, source: 'manual' });
    }
    if (!identifiers.length && !dto.displayName?.trim()) {
      throw new ConflictException('Provide displayName or at least one identifier');
    }

    const existing = identifiers.length
      ? await this.prisma.contactIdentifier.findMany({
          where: { tenantId, OR: identifiers.map(({ type, normalized }) => ({ type, normalized })) },
          include: { contact: { select: { id: true } } },
        })
      : [];
    const contactIds = [...new Set(existing.map((row) => row.contactId))];
    if (contactIds.length > 1) {
      throw new ConflictException('The supplied identifiers belong to different contacts; merge them manually first');
    }
    if (contactIds.length === 1) {
      const contactId = contactIds[0];
      const missing = identifiers.filter((candidate) => !existing.some(
        (row) => row.type === candidate.type && row.normalized === candidate.normalized,
      ));
      try {
        return await this.prisma.$transaction(async (tx) => {
          if (missing.length) await tx.contactIdentifier.createMany({
            data: missing.map(({ tenantId: t, ...data }) => ({ ...data, contactId, tenantId: t })),
            skipDuplicates: true,
          });
          if (dto.displayName?.trim()) await tx.contact.update({
            where: { id: contactId }, data: { displayName: dto.displayName.trim() },
          });
          return tx.contact.findFirstOrThrow({
            where: { id: contactId, tenantId },
            include: { identifiers: true },
          });
        });
      } catch {
        throw new ConflictException('Contact identity changed concurrently; retry the request');
      }
    }

    try {
      return await this.prisma.contact.create({
        data: {
          tenantId,
          displayName: dto.displayName?.trim(),
          identifiers: { create: identifiers.map(({ tenantId: _tenantId, ...data }) => ({ ...data, tenantId })) },
        },
        include: { identifiers: true },
      });
    } catch (error) {
      // A unique constraint may have been won by a concurrent request.
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A contact with one of these identifiers already exists; refresh and retry');
      }
      throw error;
    }
  }
}
