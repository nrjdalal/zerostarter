# The rate limiter's client-IP resolution

- Status: icebox, top priority
- Links: deepsec audit 2026-09-06 (item 3, MEDIUM / high confidence), PR #819 (built, verified, then reverted out to keep that PR to safe changes), [the public-suffix rewrite item](rate-limit-rewrite-bucket.md)

## The concern

The global limiter keys anonymous requests on `findIp(c.req.raw)` with no options, and falls back to `randomUUIDv7()` when nothing resolves (`api/hono/src/middlewares/rate-limiter.ts`). Two consequences, both live on canary:

- On a deploy where Bun owns the socket (Docker, any self-host) the request object carries no peer address, so the library reads client-controllable headers: a forged `x-forwarded-for` names its own bucket per request.
- A client that sends no such header resolves to nothing, and the random fallback gives it a fresh bucket per request, so anonymous rate limiting is silently off on a bare deploy. Vercel is unaffected on the direct path, since it overwrites `x-forwarded-for` (verified against production and a preview).

## Context

`@arcjet/ip` 1.11.0 (installed, and the latest) is built to answer exactly this, and its own adapters show the intended call shape:

- **Resolution order.** A connection address first (`ip`, `socket.remoteAddress`, `info.remoteAddress`, `requestContext.identity.sourceIp`), returned when it is a public address not listed in `proxies`; headers only after that.
- **`platform`** restricts headers to the ones that platform stamps: Cloudflare `cf-connecting-ip`, Fly `fly-client-ip`, Render `true-client-ip`, Firebase `x-fah-client-ip` then `x-forwarded-for`, Vercel `x-real-ip` then `x-vercel-forwarded-for` then `x-forwarded-for`. `@arcjet/env` exports `platform(env)`, which detects Firebase, Fly, Vercel and Render from their environment variables.
- **No platform** walks a generic list, `x-forwarded-for` last hop first and then ten other headers, which the README says to trust only behind a proxy that sets them.
- **`proxies`** takes IPs, CIDRs and proxy services; the package ships `cloudflare` (its published ranges plus its client-IP headers), so a Cloudflare-fronted self-host keys correctly on any platform without a flag.
- **Arcjet's Bun adapter** passes `{ ip: server.requestIP(request).address, headers }` with `{ platform: platform(env), proxies }`; the Node adapter passes `{ socket, headers }` with the same options. Neither filters headers by hand.
- **Gaps the caller must cover.** Hono's `c.req.raw` is a Web `Request` with no peer, so the peer has to come from `getConnInfo` (`hono/bun`), and an IPv4-mapped IPv6 peer (`::ffff:a.b.c.d`, which Bun reports only when bound to `::`) is deliberately non-global in the library, a port of Rust's `is_global`, so it needs unwrapping first. Private-only inputs resolve to an empty string, which is the signal for "internal traffic" if that is to be skipped rather than pooled.

What #819 established before the revert, all reproducible: the peer-first approach behaves as described on the running Bun server, through portless, inside `docker compose` (host, sibling container, and the web's 70 server-side session reads with no 429), and a forged header buys nothing on the Vercel preview. A hand-rolled "only `x-forwarded-for`" filter was tried and is the wrong model: it would also strip `cf-connecting-ip` and defeat the `cloudflare` service. Dropping `platform: "vercel"` was based on a probe of the old code, not evidence against `x-real-ip`; arcjet ships that order to every Vercel customer.

## Open question

Adopt the library's model as its adapters use it: `findIp({ headers, ip: peer }, { platform: platform(process.env), proxies: [cloudflare] })`, with the peer from `getConnInfo`, the mapped-address unwrap, no random fallback (one shared bucket for the unattributable), and a decision on whether a private peer that forwarded nothing is skipped as internal or pooled. Whether to expose a trusted-proxies list for custom load balancers, and what Vercel stamps on a rewrite ([the rewrite item](rate-limit-rewrite-bucket.md)), are the parts still undecided. The durable store is tracked separately in the hardening-refactors plan.

The end-to-end suite (`bun run test:e2e`, 2026-09-06) leaves the 429 untested on purpose: on a Bun-served stack the limiter finds no client address and keys every request on its own, so a test today would pin the bug. The 429 test belongs at `tests/api/hono/src/middlewares/rate-limiter.e2e.test.ts` once this lands.
