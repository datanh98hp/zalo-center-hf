import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ContactLookup = { tenantId: string; contactId?: string; zaloId?: string; phone?: string };

@Injectable()
export class ContactLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: ContactLookup) {
    const supplied = Number(Boolean(input.contactId)) + Number(Boolean(input.zaloId?.trim())) + Number(Boolean(input.phone?.trim()));
    if (supplied !== 1) throw new ConflictException('Provide exactly one of contactId, zaloId, or phone');
    if (input.contactId) {
      const contact = await this.prisma.contact.findFirst({ where: { id: input.contactId, tenantId: input.tenantId } });
      if (!contact) throw new NotFoundException('Contact not found');
      return contact;
    }
    const type = input.zaloId ? 'ZALO_ID' as const : 'PHONE' as const;
    const value = input.zaloId?.trim() ?? input.phone!.trim().replace(/[^\d+]/g, '');
    const rows = await this.prisma.contactIdentifier.findMany({
      where: { tenantId: input.tenantId, type, normalized: value },
      include: { contact: true },
      take: 2,
    });
    if (!rows.length) throw new NotFoundException('No contact matches this identifier');
    if (rows.length > 1) throw new ConflictException('Identifier is ambiguous; resolve duplicates before assigning');
    return rows[0].contact;
  }
}
