# Passkey (WebAuthn) sign-in and management

- Status: backlog
- Links: #594 · branch `feat/passkey` · closed PR #574 (kept)

Passwordless sign-in plus passkey management via the Better Auth passkey plugin (`@better-auth/passkey`): server wiring in `packages/auth` (rpID/origin/rpName derived from the app URL + trusted origins + site name, a `passkeyEnabled` flag surfaced through `/api/auth/providers`), an additive `passkey` DB table, a client sign-in button with conditional autofill, and a `/dashboard/settings/passkeys` manage page. A near-complete WIP lives on the `feat/passkey` branch.

Blocker: the WebAuthn ceremony needs human e2e (Touch ID / security key) and cannot run headlessly. Remaining: rebase `feat/passkey` onto canary (conflicts expected in the dashboard shell), re-confirm the migration and types, resume from there rather than starting fresh.
