# Webhook contract: assign contact

`POST /api/webhooks/assign-contact`

Headers:
- `Content-Type: application/json`
- `X-ZC-Signature: sha256=<hex HMAC-SHA256>`
- `Idempotency-Key: <unique-event-id>`

Example body (use exactly one customer identifier):
```json
{
  "tenantId": "tenant_123",
  "zaloId": "zalo_user_id_from_an_authorized_source",
  "employeeId": "user_789",
  "reason": "Lead from campaign 2026-10"
}
```

A phone-based request can use `"phone": "+84901234567"` instead of `zaloId`; alternatively use `contactId`. Do not send multiple identifiers in the same request. The server resolves the employee's canonical display name and uses that as the internal assignment label; client-supplied employee names are not accepted.

Expected success: `202 Accepted`. Replaying the same key and identical request returns the stored result without creating another assignment. Reusing a key with a different request returns `409 Conflict`.

The starter verifies HMAC over the exact raw request bytes. For production, provision per-tenant or per-integration webhook credentials, add a timestamp/replay window, rotate credentials, and rate-limit webhook traffic. The current shared `WEBHOOK_SECRET` is a transitional configuration and must not be shared with untrusted tenants.

## Identity semantics
- `zaloId` is a Zalo/provider identifier; `phone` is a phone number. They are stored as separate identifier types.
- Phone formatting is normalized, but country calling codes are never guessed. Supply E.164 when known.
- If a lookup is missing or ambiguous, the request fails rather than assigning an arbitrary contact.
- The label is the current employee display name at assignment time and is persisted in assignment history.
