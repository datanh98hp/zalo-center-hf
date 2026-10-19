# Agent entry point

Read `architecture.md`, `development.md`, and `../docs/security-and-deployment.md` before editing.

- Keep provider-specific behavior behind `IntegrationProvider`.
- Never assume personal Zalo inbox access exists through official APIs.
- Treat `zaloId` and normalized `phone` as separate identifiers; neither is the database primary key.
- Every request is tenant-scoped. Derive tenant and actor from authenticated claims, not client-supplied IDs.
- Assignment and webhook operations must be audited and idempotent; use transactions/outbox for production reliability.
- Never log access tokens, message bodies, phone numbers, or webhook secrets in plaintext.
- Add tests for authorization, cross-tenant access, duplicate webhook delivery, and identifier matching.
- Never commit `.env`, API tokens, customer exports, or message contents.

8. Never send a message unless an active provider adapter exists and the provider confirms the capability.
9. Use tenant-scoped uniqueness for customer identifiers; never globally unique phone/Zalo IDs across tenants.
10. Keep outbound message sending separate from message persistence; use queue/outbox and explicit provider status transitions.

11. Webhook credentials must be workspace-scoped, revocable, and returned only once. Sign exact raw body bytes; use idempotency keys.
12. Persist outbound message + job + outbox event in one database transaction. Never claim provider delivery when only queued.
