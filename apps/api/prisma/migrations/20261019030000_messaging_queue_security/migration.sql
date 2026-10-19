ALTER TYPE "IntegrationKind" ADD VALUE IF NOT EXISTS 'ZALO_PERSONAL_APPROVED';
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "webhookSecretHash" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
CREATE INDEX IF NOT EXISTS "Message_status_createdAt_idx" ON "Message"("status", "createdAt");
CREATE TABLE "OutboundJob" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "integrationId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL, "messageId" TEXT NOT NULL, "recipientId" TEXT NOT NULL,
  "text" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3), "lastError" TEXT, "providerMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboundJob_pkey" PRIMARY KEY ("id"), CONSTRAINT "OutboundJob_messageId_key" UNIQUE ("messageId"),
  CONSTRAINT "OutboundJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutboundJob_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OutboundJob_status_availableAt_idx" ON "OutboundJob"("status", "availableAt");
CREATE INDEX "OutboundJob_tenantId_createdAt_idx" ON "OutboundJob"("tenantId", "createdAt");
CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "integrationId" TEXT, "eventType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboxEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_tenantId_createdAt_idx" ON "OutboxEvent"("tenantId", "createdAt");
CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL, "stateHash" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "integrationId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id"), CONSTRAINT "OAuthState_stateHash_key" UNIQUE ("stateHash"),
  CONSTRAINT "OAuthState_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");
CREATE TABLE "TokenRevocation" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenRevocation_pkey" PRIMARY KEY ("id"), CONSTRAINT "TokenRevocation_tokenHash_key" UNIQUE ("tokenHash")
);
CREATE INDEX "TokenRevocation_expiresAt_idx" ON "TokenRevocation"("expiresAt");
CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL, "identityHash" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeeded" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginAttempt_identityHash_occurredAt_idx" ON "LoginAttempt"("identityHash", "occurredAt");

CREATE TABLE "TenantWebhookCredential" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "keyHash" TEXT NOT NULL, "keyEncrypted" TEXT NOT NULL,
  "label" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMP(3),
  CONSTRAINT "TenantWebhookCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantWebhookCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TenantWebhookCredential_tenantId_keyHash_key" ON "TenantWebhookCredential"("tenantId", "keyHash");
CREATE INDEX "TenantWebhookCredential_tenantId_revokedAt_idx" ON "TenantWebhookCredential"("tenantId", "revokedAt");
