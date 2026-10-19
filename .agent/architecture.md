# Architecture

- Modular monolith: NestJS modules, Next.js UI, Prisma/PostgreSQL source of truth.
- Redis is reserved for queues/rate limits/distributed realtime fan-out; provider retries must be durable.
- `ContactIdentifier` stores ZALO_ID and PHONE separately; a future identity-resolution service must detect ambiguity instead of merging on phone alone.
- Provider adapters normalize external events into internal records. Do not equate an internal employee label with a native Zalo tag unless provider APIs support it.
- Socket events are emitted after database commit. WebSocket delivery is not source of truth; REST re-fetch handles reconnect.
- Webhook idempotency keys are unique per tenant; production should use transactional outbox and replay-window validation.
- Every endpoint must enforce tenant boundaries and role-based access.
