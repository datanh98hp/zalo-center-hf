# Security and VPS deployment

## Current implementation boundaries
- Passwords use Node.js scrypt with per-password random salt.
- API login issues HS256 bearer tokens with issuer/audience checks; configure `JWT_SECRET` with at least 48 random characters and rotate it operationally.
- Role guard supports OWNER, ADMIN, MANAGER, AGENT; management endpoints declare allowed roles.
- Assignment lookup checks contact and active agent in the same tenant, uses serializable transactions/retries, and writes assignment + audit atomically. A partial unique index enforces at most one active assignment per contact.
- Webhook uses HMAC-SHA256 over raw request bytes, an idempotency key, PostgreSQL advisory locking, and an atomic transaction for event + assignment. The current shared webhook secret is a remaining multi-tenant hardening gap; replace it with per-tenant/per-integration credentials before operating an untrusted multi-tenant service.
- Socket.IO requires a valid bearer JWT in `handshake.auth.token` and joins a server-derived tenant room.
- Personal Zalo adapter is intentionally not implemented. Only implement it when a supported, authorized integration path is confirmed.

## Before production
1. Put the app behind a TLS reverse proxy (Caddy/Nginx); only expose 80/443 publicly.
2. Generate separate strong secrets for JWT, webhook, PostgreSQL, and Redis. Do not use example values.
3. Run Prisma migration deploy as a release step; never run `migrate dev` in production.
4. Add login throttling, refresh/revocation strategy, CSRF strategy if cookies are used, and session/device controls.
5. Add the production rate limiter and webhook credential rotation before exposing auth/webhooks to the public Internet.
6. Encrypt provider credentials using a managed key or envelope encryption; `encryptedAuth` is only a schema field at present.
7. Configure webhook timestamp/replay validation, a durable transactional outbox, retry queue, and dead-letter handling.
8. Add tenant foreign keys to all tenant-owned tables, robust audit actor foreign keys where appropriate, and tests for cross-tenant isolation.
9. Configure log redaction, database backups, restore drills, retention/deletion policy, monitoring and alerts.
10. Restrict DB and Redis to private networks; ensure Redis auth and persistence are configured.
11. Review Zalo OA app scopes, webhook verification and send-message permissions against the current official docs before enabling production traffic.

## Initial setup
- Copy `infra/.env.example` to `infra/.env` and set secure values.
- Copy `apps/api/.env.example` to `apps/api/.env`, set `JWT_SECRET`, `WEBHOOK_SECRET`, and bootstrap credentials. Copy `infra/.env.example` to `infra/.env`; set `NEXT_PUBLIC_API_URL` and the public `WEB_ORIGIN`.
- Build from repository root: `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build`.
- The API container runs `prisma migrate deploy` before starting. For an initial owner, run the documented one-time bootstrap from a trusted admin workstation while PostgreSQL is bound to loopback; remove bootstrap variables afterwards.
