# Bind the split-mode OAuth callback to the handoff nonce (close the api-origin login-CSRF window)

- Status: decided (accepted as a known split-mode tradeoff, documented in code + the PR; the tighter binding below is a deferred, unscheduled optional hardening)
- Links: #720 · #719 (threat model)

**Concern.** Split mode sets `account.skipStateCookieCheck` so OAuth completes on Safari/Firefox (the `state` cookie is a blocked/partitioned third-party write). The DB-stored `state` still rejects unknown/forged/expired/replayed values, but it is server-issued and single-use, **not browser-bound**. So a classic OAuth login-CSRF reopens on the **api origin**: an attacker holding a fresh, unconsumed `code`+`state` can relay the callback to a victim by top-level navigation; Better Auth mints the attacker's session and `Set-Cookie`s it (`SameSite=None`) in the victim's browser on the api origin. The nonce handoff rebinds only the **web-origin SSR** cookie, so SSR is safe, but any client-side browser->api call (credentials, `SameSite=None`) then authenticates as the attacker.

**Bounding realities.** Requires relaying a live single-use OAuth `code` within its short window by top-level navigation. Safari/Firefox partition the api-origin cookie in a third-party context, so the client-side exposure is largely Chrome-with-third-party-cookies, i.e. the browsers the handoff is least needed for. It is also the posture Better Auth's own `oauth-proxy` plugin accepts for cross-origin OAuth. In this repo the client-side authenticated api surface in split mode is itself the deferred A2 item, so the exposed surface is not yet first-class.

**Decision (2026-07-16).** Accepted as a known split-mode tradeoff and documented at the `skipStateCookieCheck` call site and in the PR, since it is inherent to cookie-less cross-origin OAuth (the posture Better Auth's own `oauth-proxy` takes) and the exposure is bounded as above.

**Optional future hardening (deferred, unscheduled).** Bind the OAuth `state`/callback to the same nonce so the api-origin session is not usable until the nonce-bound handoff completes (e.g. don't let the callback hand a usable api session in split mode; gate activation on the handoff). A non-trivial change to Better Auth's callback flow; revisit if the client-side split-mode surface (A2) becomes first-class.
