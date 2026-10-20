# Zalo Center — engineering starter v0.5

Monorepo starter for a multi-source Zalo customer inbox and assignment platform.

## Stack
- `apps/web`: Next.js 16 App Router, TypeScript, Tailwind CSS v4
- `apps/api`: NestJS 11, Prisma, PostgreSQL, Socket.IO
- `infra`: PostgreSQL + Redis and Compose deployment topology
- `.agent`: architecture and coding-agent instructions

## Implemented in this iteration
- Prisma models and initial SQL migration
- Password hashing (scrypt), signed bearer access token, login endpoint
- Employee list/create endpoints with role checks
- Tenant-scoped contact list/create and separate Zalo ID / phone identifiers
- Quick reply list/create/update endpoints
- Manual assignment endpoint with tenant-scoped validation, transaction, audit log, and realtime event
- HMAC-signed webhook assignment endpoint with raw-body signature, idempotency key, advisory lock, and atomic assignment transaction
- Tenant-scoped contact identity uniqueness and a database constraint allowing one active assignment per contact
- Conversation/message read APIs, integration metadata API, audit log API
- Socket.IO JWT authentication with tenant-isolated rooms
- Login screen and API-connected contact list/create screen
- Unit tests for security primitives and assignment service
- API and web Dockerfiles plus VPS-oriented Compose topology

## Not yet production-complete
- First-owner bootstrap and password reset/MFA/session revocation
- Full end-to-end integration tests, distributed rate limiting, refresh/revocation, complete admin CRUD screens
- Transactional outbox, webhook replay timestamp window, queue retry/DLQ
- Actual Zalo OA OAuth/webhook/send adapter and credentials encryption
- Personal-account connector: not implemented pending confirmation of a supported, authorized integration path
- Full inbox UI, actual Zalo OA OAuth/send/receive adapter, and remaining admin lifecycle screens

## Local development
Requirements: Node.js 22+, pnpm 10+, Docker.

1. `corepack enable && pnpm install`
2. `cp apps/api/.env.example apps/api/.env` and set secrets.
3. For local DB, use the compose service with explicit `POSTGRES_PASSWORD`; or set `DATABASE_URL` to your PostgreSQL.
4. For first owner only, set bootstrap variables and run `pnpm --filter @zalo-center/api bootstrap` (ensure the database is available; unset bootstrap variables afterwards).
5. `pnpm --filter @zalo-center/api prisma:generate`
6. `pnpm --filter @zalo-center/api prisma:migrate`
7. `pnpm dev`
8. Tests: `pnpm --filter @zalo-center/api test`

## VPS
Read `docs/security-and-deployment.md`. Set `infra/.env` from the example, set `apps/api/.env`, put a TLS reverse proxy in front, and do not expose PostgreSQL/Redis publicly. The provided Compose file binds web/API ports to loopback.

For Docker deployments, start the services with `pnpm docker:up`. To generate the Prisma client and apply pending migrations inside the running API container, run `pnpm docker:prisma`. The API container also applies migrations automatically at startup.

This is a working engineering foundation, not a claim that all provider integrations are available. Verify current official Zalo OA permissions before production integration.

## v0.3 progress
See `docs/implementation-status-v0.3.md` for added APIs, migration notes, and production gaps. Do not treat this starter as production-ready until security and integration checklists are completed.

## v0.4 messaging
See `docs/messaging-integration-v0.4.md` for OA OAuth, inbound webhook, queued outbound messages, cursor pagination, token revocation, and security configuration.

## v0.5 personal-account QR clarification
The Integrations screen now explicitly marks personal Zalo QR as **not implemented** and explains the verification gate. The API rejects `ZALO_PERSONAL_APPROVED` creation until an authorized adapter is implemented. This release does not scan QR codes or automate Zalo Web. See `docs/personal-zalo-qr.md` for the authorization checklist, proposed adapter boundary, security requirements, and acceptance criteria. Do not represent metadata registration as a connected account.


## Cập nhật v0.6 — chuẩn hóa trạng thái Zalo cá nhân

- Làm rõ trạng thái adapter QR chưa khả dụng trên màn hình Tài khoản kết nối.
- Hiển thị ba bước cần hoàn tất trước khi bật QR: xác minh quyền, triển khai adapter, kiểm thử hai chiều.
- Nút QR bị vô hiệu hóa có chủ đích; không tạo QR giả và không tuyên bố đã kết nối khi chưa xác thực.
- Bổ sung liên kết tài liệu Zalo Developer và cập nhật kế hoạch tích hợp.
