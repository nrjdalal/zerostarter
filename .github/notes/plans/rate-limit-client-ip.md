# Rate limiter's anonymous IP key: spoofable today, fail-open behind a proxy

- Status: icebox (undecided; tracked in #707)
- Raised by: #702 review (same-origin host-only auth + portless local URLs)

## The concern

`api/hono/src/middlewares/rate-limiter.ts` keys anonymous requests on `ip:${findIp(c.req.raw) || randomUUIDv7()}`, calling `findIp` from `@arcjet/ip` with no options. Two consequences, neither of which depends on the same-origin proxy landing:

- **Spoofable today.** With no `platform` option, `findIp` skips its cloudflare / vercel / fly-io / render branches and falls through to the generic `x-forwarded-for` path. That header is client-settable, so an anonymous caller can rotate its own key and sidestep the limit. This is current canary behavior, not a future risk.
- **Fail-open, not shared-bucket.** `findIp` returns `""` when it finds no global IP (it rejects private and loopback ranges), and `"" || randomUUIDv7()` mints a fresh key per request, so the limiter silently no-ops rather than collapsing callers into one bucket.

The same-origin proxy raised in #702 sharpens the second one: a proxy on the same host presents a loopback address, which `findIp` rejects, so proxied anonymous traffic is the case most likely to land on the fail-open path. Note the proxy hop itself is not the trigger. `findIp` reads `request.socket?.remoteAddress`, and `c.req.raw` is a WHATWG `Request` with no `.socket`, so the socket address never enters the picture either way.

Related: because `platform` is never passed, the trusted `x-vercel-forwarded-for` / `x-real-ip` path is skipped on Vercel too, so the deployed default gets the generic header handling rather than the platform's.

## Why it's on ice, not scheduled

Real, but narrow and cheapest to fix in company:

- The authenticated paths key on `userid:` / `apikey:`, not IP, so this only touches the anonymous fallback.
- Getting it right means a deliberate trusted-proxy decision (which forwarded header to trust, and how many hops), which is cheapest to make alongside the durable rate-limit store in the eval's P0-4. The in-memory store is already a no-op on serverless, so an IP-key fix on its own buys little there.

## If it thaws

Pass `findIp` an explicit `platform` (and `proxies` where a fixed hop is known) so the trusted header is read per deploy target rather than guessed, decide whether an unresolvable IP should fail open or closed rather than inheriting `randomUUIDv7()` by accident, and land it with P0-4's durable store. See [saas-starter-evals.md](saas-starter-evals.md) (P0-4).
