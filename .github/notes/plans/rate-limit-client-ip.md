# Rate limiter loses the client IP behind the same-origin proxy

- Status: needs verification (raised in PR #702 review)
- Links: PR #702 (same-origin host-only auth + portless)

Since PR #702, all anonymous browser HTTP (sign-in POSTs, `/api/auth/get-session`, health) is proxied same-origin: browser -> web host `/api/*` -> Next `rewrites()` -> the API. The API rate limiter (`api/hono/src/middlewares/rate-limiter.ts`) keys anonymous requests on `ip:${findIp(c.req.raw)}` (`@arcjet/ip`), and `/api/auth/*` is under the global limiter.

**Risk.** On Vercel (web and api are separate projects; `INTERNAL_API_URL` is unset in prod, so the rewrite targets the public `NEXT_PUBLIC_API_URL`), the API function may see the _web function's_ egress IP via `x-vercel-forwarded-for`, not the real client. Consequences:

- all anonymous clients could collapse into one `ip:` bucket -> spurious 429s on login/get-session and weakened brute-force protection;
- an extra internet hop + double function invocation per anonymous auth/API call.

Not reproducible locally: `findIp` returns nothing global on localhost and falls back to `randomUUIDv7()` (a fresh bucket per request), so the local e2e never exercised this.

**Verify (real preview/prod).** Hit `/api/auth/get-session` or a sign-in POST from two different client IPs and confirm the limiter attributes them to distinct buckets, i.e. the API reads the _client_ IP, not the web egress IP.

**Candidate fixes if attribution is wrong:**

1. Read the client IP from the forwarded chain the Next rewrite passes through (leftmost `x-forwarded-for`), configuring `@arcjet/ip` / the limiter to trust the web proxy rather than `x-vercel-forwarded-for` (the direct caller). Least invasive if `findIp` can be pointed at the right header.
2. Have the web layer forward the real client IP in a header the API trusts (needs Next middleware, not a declarative rewrite).
3. Move anonymous rate-limiting to the web edge (Next middleware), where the client IP is authoritative, and keep the API limiter for direct/service traffic.

Confirm on a preview before choosing.
