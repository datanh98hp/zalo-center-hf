# Development conventions

- TypeScript strict mode; avoid `any`.
- Validate all inbound payloads using DTO validation.
- Keep controllers thin; put business rules in services.
- Use Prisma migrations for schema changes.
- Add tenant and role checks to every data access path.
- Use structured logs with PII redaction.
- Never commit `.env`, API tokens, customer exports, or message contents.
- Add unit tests for business rules and integration tests for webhook contracts.
- Tailwind CSS v4 is configured through `@import "tailwindcss";` and CSS-first configuration.
