# Handoff cookie lifetime drifts from the session (SSR logs out early)

- Status: iceboxed (raised in #720 review, follow-up)
- Links: #720 · #721 (build-time successor)

**Concern.** The web's first-party session cookie (set by `/api/handoff`) pins `maxAge` to the session's `expiresAt` at handoff time. Better Auth extends `session.expiresAt` in place as the user stays active (`updateAge`), but the web's copy is never re-extended, so for a long-lived session the SSR pages log the user out at the original expiry (~7 days from sign-in) even while the api-side session is still valid. Split mode only.

**Direction (not committed).** Re-issue the web cookie with a refreshed `maxAge` on a successful SSR `getSession` (the server already reads the session there). Only bites long-lived sessions past the first expiry window. No verdict on the exact trigger or whether it is worth the extra Set-Cookie on SSR responses.
