# v0.3 implementation notes

## Added in this iteration
- Tenant-scoped contact identifier uniqueness, including a SQL migration that backfills tenantId from Contact.
- A database partial unique index enforces one active assignment per contact.
- Assignment uses serializable transactions and retries known PostgreSQL/Prisma concurrency conflicts.
- Webhook assignment supports contactId, zaloId, or phone (exactly one), and resolves employee labels from the canonical employee record.
- Webhook event processing and assignment are now performed in one Prisma transaction; PostgreSQL advisory locks serialize repeated tenant/idempotency-key requests.
- Conversation list and message-history read endpoints.
- Tenant-scoped audit log listing for owner/admin/manager roles.
- Login screen and API-connected customer, employee, quick-reply, and integration-metadata screens.
- Integration-account metadata CRUD endpoint (no tokens returned or accepted).
- Socket.IO connection authentication and tenant-room isolation.
- Tests for contact identity resolution and token/password helpers.
- API container runs `prisma migrate deploy` before starting the server.

## API endpoints
- `POST /api/auth/login`
- `GET|POST /api/employees`
- `GET|POST /api/contacts`
- `POST /api/assignments`
- `GET|POST /api/quick-replies`, `PATCH /api/quick-replies/:id`
- `GET|POST /api/integrations`
- `GET /api/inbox/conversations?limit=30`
- `GET /api/inbox/conversations/:id/messages?limit=30`
- `GET /api/audit?limit=50`
- `POST /api/webhooks/assign-contact` (HMAC-SHA256 + Idempotency-Key)
- `GET /api/health`

## Before production
- Run all tests and migrations against a disposable PostgreSQL instance. The current environment could validate TypeScript syntax and JSON/YAML structure, but could not install dependencies or execute Jest/Prisma tests.
- Add login rate limiting, token revocation/refresh, and role-change invalidation.
- Replace global webhook secret with per-tenant rotated credentials or per-integration credentials.
- Add an outbox table and a background worker so realtime notifications are durable.
- Add integration-specific OAuth and encrypted secret storage; never claim personal Zalo API access without documented authorization.
- Add provider webhook signature verification and replay controls for each provider.
- Add per-agent conversation authorization rules, audit browsing, backup restore drills, and operational metrics.
- Configure TLS reverse proxy and restrictive firewall rules.
