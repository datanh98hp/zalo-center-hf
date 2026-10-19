-- Add tenant scope to identifiers and enforce uniqueness per tenant.
ALTER TABLE "ContactIdentifier" ADD COLUMN "tenantId" TEXT;
UPDATE "ContactIdentifier" ci SET "tenantId" = c."tenantId"
FROM "Contact" c WHERE c."id" = ci."contactId";
ALTER TABLE "ContactIdentifier" ALTER COLUMN "tenantId" SET NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ContactIdentifier"
    GROUP BY "tenantId", "type", "normalized" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate contact identifiers exist within a tenant. Resolve duplicate contacts before applying this migration.';
  END IF;
END $$;

DROP INDEX IF EXISTS "ContactIdentifier_contactId_type_normalized_key";
DROP INDEX IF EXISTS "ContactIdentifier_type_normalized_idx";
CREATE UNIQUE INDEX "ContactIdentifier_tenantId_type_normalized_key"
  ON "ContactIdentifier"("tenantId", "type", "normalized");
ALTER TABLE "ContactIdentifier" ADD CONSTRAINT "ContactIdentifier_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
