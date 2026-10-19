# Messaging integration v0.4 (carried into v0.5)

## Implemented API routes
- `GET /api/integrations/oa-oauth/start?integrationId=<id>` (OWNER/ADMIN, bearer token) returns a Zalo OA authorization URL.
- `GET /api/integrations/oa-oauth/callback?code=...&state=...` exchanges code and encrypts credentials at rest.
- `GET|POST /api/webhook-credentials`, `POST /api/webhook-credentials/:id/revoke` (workspace-specific webhook signing keys; raw key shown once)
- `POST /api/webhooks/assign-contact` (requires `X-ZC-Webhook-Key`, HMAC `X-ZC-Signature`, and `Idempotency-Key`)
- `POST /api/webhooks/zalo-oa/:integrationId` verifies `X-ZEvent-Signature` against raw body using that integration's OA app secret; stores inbound message idempotently.
- `GET /api/inbox/conversations?limit=30`
- `GET /api/inbox/conversations/:id/messages?limit=30&before=<messageId>` uses cursor pagination.
- `POST /api/inbox/conversations/:id/messages` persists a queued message and durable job; API returns after enqueue, not after delivery.
- `POST /api/auth/logout` revokes the current bearer token.

## Required environment
- `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_REDIRECT_URI` (HTTPS callback registered in Zalo developer console)
- `INTEGRATION_ENCRYPTION_KEY`: 32 random bytes as 64 hex characters
- `PUBLIC_API_URL`, `JWT_SECRET`, `WEBHOOK_SECRET`
- `ZALO_OA_AUTHORIZE_URL`, `ZALO_OA_TOKEN_URL`, `ZALO_OA_API_BASE` may override provider endpoints for controlled testing

Generate an encryption key with `openssl rand -hex 32`. Back it up securely. Losing it makes stored OA tokens unrecoverable. Never commit secrets to Git.

## Workspace webhook signature
Create a workspace-specific signing key using the authenticated admin endpoint. The secret is returned once. Send `X-ZC-Webhook-Key: <secret>` and `X-ZC-Signature: sha256=<hex HMAC-SHA256 over exact raw request bytes>`. Revoking the credential invalidates it immediately. The application stores a SHA-256 lookup hash and an AES-256-GCM encrypted copy for signature verification; configure the encryption key securely.

## Queue semantics
PostgreSQL tables `OutboundJob` and `OutboxEvent` are the durable queue. The worker polls, claims jobs with conditional updates, retries using exponential backoff, and marks exhausted jobs `DEAD`. This avoids requiring Redis/BullMQ to be the source of truth. For multiple API replicas, use `FOR UPDATE SKIP LOCKED` in a dedicated worker process before scaling horizontally; the starter's conditional claim avoids many duplicates but is not a full distributed scheduler.

## Zalo OA notes
- The OA app must be configured/approved for required scopes and message types.
- Service/customer-care messages are subject to Zalo OA policy, recipient interaction status, and time windows. API acceptance does not guarantee delivery.
- Verify webhook signature format against the current developer-console documentation for the app and configure a real webhook URL.
- Provider payloads vary by event type; image/file/media payloads need dedicated normalizers and storage policy.

## Personal Zalo
There is intentionally no QR login automation, password-based personal-account login, browser automation, reverse-engineered private API, or cookie/session scraping. Public developer docs list OA APIs, ZBS, Social API and SDKs, but do not establish a general supported API for reading/sending all messages in arbitrary personal inboxes. `ZALO_PERSONAL_APPROVED` is a reserved adapter type only; it must remain disabled until the operator supplies a documented, authorized provider/partner contract and adapter implementation.

## Limitations / production hardening
- OAuth callback returns a small confirmation JSON; redirect to a frontend success page in deployment.
- Validate provider's exact signature algorithm and event schema with the registered OA app before production.
- Implement token refresh proactively and alert on refresh failure; the worker refreshes when sending.
- Worker recovers stale `PROCESSING` claims after two minutes; for multiple API replicas, use `FOR UPDATE SKIP LOCKED` in a dedicated worker process.
- Outbox realtime publishing is at-least-once; client consumers must deduplicate by event/message id.
- Add end-to-end tests against a staging OA and database, plus rate limits at reverse proxy.
