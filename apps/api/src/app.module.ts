import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { WebhookController } from './webhooks/webhook.controller';
import { AssignmentService } from './assignments/assignment.service';
import { AssignmentsController } from './assignments/assignments.controller';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { EmployeesController } from './employees/employees.controller';
import { ContactsController } from './contacts/contacts.controller';
import { ContactLookupService } from './contacts/contact-lookup.service';
import { QuickRepliesController } from './quick-replies/quick-replies.controller';
import { IntegrationsController } from './integrations/integrations.controller';
import { InboxController } from './inbox/inbox.controller';
import { AuditController } from './audit/audit.controller';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { OaOAuthController } from './integrations/oa-oauth.controller';
import { OaWebhookController } from './integrations/oa-webhook.controller';
import { OutboundQueueService } from './outbox/outbound-queue.service';
import { WebhookCredentialsController } from './webhooks/webhook-credentials.controller';

@Module({
  controllers: [
    HealthController, WebhookController, AuthController, EmployeesController,
    ContactsController, QuickRepliesController, AssignmentsController,
    IntegrationsController, InboxController, AuditController, OaOAuthController, OaWebhookController, WebhookCredentialsController,
  ],
  providers: [
    PrismaService, AssignmentService, ContactLookupService, RealtimeGateway, AuthGuard, RolesGuard, OutboundQueueService,
  ],
})
export class AppModule {}
