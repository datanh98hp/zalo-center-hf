import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContactLookupService } from './contact-lookup.service';

describe('ContactLookupService', () => {
  const prisma = {
    contact: { findFirst: jest.fn() },
    contactIdentifier: { findMany: jest.fn() },
  };
  let service: ContactLookupService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactLookupService(prisma as never);
  });

  it('requires exactly one identifier', async () => {
    await expect(service.resolve({ tenantId: 't' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.resolve({ tenantId: 't', contactId: 'c', phone: '123' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('scopes direct contact lookup to tenant', async () => {
    prisma.contact.findFirst.mockResolvedValue(null);
    await expect(service.resolve({ tenantId: 'tenant-a', contactId: 'contact-b' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contact.findFirst).toHaveBeenCalledWith({ where: { id: 'contact-b', tenantId: 'tenant-a' } });
  });

  it('normalizes phone formatting and returns matching contact', async () => {
    const contact = { id: 'c1', tenantId: 't1' };
    prisma.contactIdentifier.findMany.mockResolvedValue([{ contact }]);
    await expect(service.resolve({ tenantId: 't1', phone: '+84 (90) 123-4567' })).resolves.toEqual(contact);
    expect(prisma.contactIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 't1', type: 'PHONE', normalized: '+84901234567' },
    }));
  });

  it('rejects ambiguous identifier matches', async () => {
    prisma.contactIdentifier.findMany.mockResolvedValue([{ contact: { id: 'a' } }, { contact: { id: 'b' } }]);
    await expect(service.resolve({ tenantId: 't1', zaloId: 'z1' })).rejects.toBeInstanceOf(ConflictException);
  });
});
