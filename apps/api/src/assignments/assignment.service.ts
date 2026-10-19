import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type AssignmentRequest = {
  tenantId: string;
  contactId: string;
  employeeId: string;
  assignedBy?: string;
  reason?: string;
};

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  async assign(input: AssignmentRequest) {
    let result: Awaited<ReturnType<AssignmentService['assignInTransaction']>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await this.prisma.$transaction(
          (tx) => this.assignInTransaction(tx, input),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if ((code === 'P2034' || code === 'P2002') && attempt < 2) continue;
        if (code === 'P2002' || code === 'P2034') {
          throw new ConflictException('Assignment changed concurrently; retry the request');
        }
        throw error;
      }
    }
    if (!result) throw new ConflictException('Assignment could not be completed');
    this.realtime.publishTenantEvent(input.tenantId, 'assignment.updated', {
      contactId: result.contactId, employeeId: result.employeeId, label: result.label, assignmentId: result.id,
    });
    return result;
  }

  async assignInTransaction(tx: Prisma.TransactionClient, input: AssignmentRequest) {
    const [contact, employee] = await Promise.all([
      tx.contact.findFirst({ where: { id: input.contactId, tenantId: input.tenantId }, select: { id: true } }),
      tx.user.findFirst({
        where: { id: input.employeeId, tenantId: input.tenantId, isActive: true },
        select: { id: true, displayName: true, role: true },
      }),
    ]);
    if (!contact) throw new NotFoundException('Contact not found in this workspace');
    if (!employee || employee.role !== UserRole.AGENT) {
      throw new NotFoundException('Active agent not found in this workspace');
    }

    await tx.assignment.updateMany({
      where: { contactId: contact.id, active: true },
      data: { active: false, endedAt: new Date() },
    });
    const assignment = await tx.assignment.create({
      data: {
        contactId: contact.id, userId: employee.id, label: employee.displayName,
        assignedBy: input.assignedBy, reason: input.reason, active: true,
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId, actorId: input.assignedBy,
        action: 'contact.assigned', entityType: 'Contact', entityId: contact.id,
        metadata: { employeeId: employee.id, label: employee.displayName, reason: input.reason ?? null },
      },
    });
    return {
      id: assignment.id, contactId: contact.id, employeeId: employee.id,
      label: employee.displayName, createdAt: assignment.createdAt,
    };
  }
}
