ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_integrationId_fkey"
FOREIGN KEY ("integrationId") REFERENCES "Integration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
