-- Preserve the newest active assignment if old data contains duplicates.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "contactId" ORDER BY "createdAt" DESC, "id" DESC) AS rn
  FROM "Assignment" WHERE "active" = true
)
UPDATE "Assignment" a SET "active" = false, "endedAt" = COALESCE(a."endedAt", CURRENT_TIMESTAMP)
FROM ranked r WHERE a."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "Assignment_one_active_per_contact_key"
  ON "Assignment"("contactId") WHERE "active" = true;
