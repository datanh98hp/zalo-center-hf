import { ConflictException, NotFoundException } from '@nestjs/common';
import { AssignmentService } from './assignment.service';

describe('AssignmentService', () => {
  const prisma: any = { $transaction: jest.fn() };
  const realtime: any = { publishTenantEvent: jest.fn() };
  let service: AssignmentService;
  const input = { tenantId: 't1', contactId: 'c1', employeeId: 'u1' };
  const tx: any = {
    contact: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    assignment: {
      updateMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'a1', createdAt: new Date('2026-01-01') }),
    },
    auditLog: { create: jest.fn() },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    tx.contact.findFirst.mockResolvedValue({ id: 'c1' });
    tx.user.findFirst.mockResolvedValue({ id: 'u1', displayName: 'Lan Anh', role: 'AGENT' });
    tx.assignment.create.mockResolvedValue({ id: 'a1', createdAt: new Date('2026-01-01') });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));
    service = new AssignmentService(prisma, realtime);
  });

  it('rejects contacts outside the tenant', async () => {
    tx.contact.findFirst.mockResolvedValue(null);
    await expect(service.assign(input)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.assignment.create).not.toHaveBeenCalled();
  });

  it('rejects users who are not active agents', async () => {
    tx.user.findFirst.mockResolvedValue({ id: 'u1', displayName: 'Manager', role: 'MANAGER' });
    await expect(service.assign(input)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('writes assignment and audit in a serializable transaction then emits realtime event', async () => {
    const result = await service.assign(input);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(tx.assignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { contactId: 'c1', active: true } }));
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(result.label).toBe('Lan Anh');
    expect(realtime.publishTenantEvent).toHaveBeenCalledWith('t1', 'assignment.updated', expect.objectContaining({ contactId: 'c1' }));
  });

  it('retries serialization conflicts and then succeeds', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' }).mockImplementationOnce(async (fn: any) => fn(tx));
    await expect(service.assign(input)).resolves.toMatchObject({ id: 'a1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('turns exhausted concurrent writes into a conflict response', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(service.assign(input)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
