# Delivery roadmap

## Phase 1 — Foundation
- Tenant isolation, authentication, RBAC (owner/admin/manager/agent)
- Contact identity resolution (`zalo_id`, normalized phone, provider-scoped external IDs)
- Assignment transaction, labels, audit log, idempotent webhook
- Quick-reply CRUD and search

## Phase 2 — Inbox
- Authorized Zalo OA OAuth/token lifecycle
- Webhook verification, inbound normalization, outbound send adapter
- Conversation list, message timeline, send status, reconnect/resync
- Socket.IO events emitted only after persistence

## Phase 3 — Operations
- Redis-backed queue and retry with exponential backoff
- Dead-letter queue, webhook delivery metrics, provider health
- Search, filters, pagination, exports with access controls
- Retention, deletion requests, backups, alerts

## Acceptance criteria
- Same phone and Zalo ID can be associated to one contact without treating them as interchangeable.
- Replayed assignment webhook does not create duplicate assignment or audit events.
- Agents can only access authorized tenant data and conversations assigned/shared with them.
- Inbound/outbound status survives browser refresh and reconnect.
- Provider outage is visible and does not silently lose inbound events.
