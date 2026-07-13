# Rate limiter may lose the client IP behind the same-origin proxy

- Status: icebox (undecided; tracked in #707)
- Raised by: #702 review (same-origin host-only auth + portless local URLs)

## The concern

`api/hono/src/middlewares/rate-limiter.ts` keys anonymous requests on `ip:${findIp(c.req.raw)}`. #702 routes browser auth same-origin through the Next rewrite (`/api/auth` proxied to the API), so a request that arrives via that proxy carries the proxy's address, not the real client's. Two ways that could go wrong:

- If `findIp` resolves to the proxy's socket address, every proxied client shares one `ip:` bucket, so the anonymous limit becomes effectively global: one noisy client can rate-limit everyone.
- If it instead trusts `x-forwarded-for` unconditionally, that header is client-settable, so the limit is trivially spoofable.

## Why it's on ice, not scheduled

It may be less real than it looks, which is exactly why it sits here rather than in the backlog:

- The authenticated paths key on `userid:` / `apikey:`, not IP, so the proxy only touches the anonymous fallback.
- In production the API is also reachable on its own origin, not only through the web proxy, so the shared-bucket case may be narrow.
- Getting it right means a deliberate trusted-proxy decision (which forwarded header to trust, and how many hops), which is cheapest to make alongside the durable rate-limit store in the eval's P0-4, not on its own.

## If it thaws

Confirm the real client IP actually collapses under the proxy (reproduce it), decide the trusted hop count, read the forwarded header only from the trusted proxy, and land it with P0-4's durable store. See [saas-starter-evals.md](saas-starter-evals.md) (P0-4).
