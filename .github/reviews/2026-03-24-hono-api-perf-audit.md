# Hono API Performance Audit

Date: 2026-03-24

## Context

The Hono API (`api/hono`) is built with tsdown (code-split dist) then re-bundled into a single file via `bun build`. The final bundle is **1.2MB**. This audit identifies performance bottlenecks and proposes fixes in priority order.

---

## 1. ~~Stop double-bundling~~ (investigated — not actionable)

**Status:** SKIPPED

**Problem:** The build runs tsdown then `bun build` to flatten into a single file. Initial hypothesis was that double-bundling caused bloat.

**Investigation:** Tested three approaches:

- tsdown (externals) → bun build (inlines all): **1.28MB**
- tsdown (`alwaysBundle: [/.*/]`) → bun build (flatten): **1.27MB**
- tsdown (`alwaysBundle: [/.*/]`) alone (code-split): **1.05MB used** but requires `node_modules` or multi-file dist in Docker

**Conclusion:** The ~1% difference is negligible. The real bloat is from drizzle-orm and better-auth shipping unused adapters (SQLite dialects, Kysely adapter, migrator, valibot/effect/arktype schema adapters) that neither bundler can tree-shake. Removing the `bun build` step would require copying `node_modules` into Docker, increasing image size far more than the current approach. The current two-step build is the right tradeoff: zero `node_modules`, single file, minimal Docker image.

**Files:** No changes

---

## 2. ~~Remove logger in production~~ (keeping — needed for observability)

**Status:** SKIPPED

**Problem:** `hono/logger` writes to stdout on every request. Minor perf cost but logging is essential for production debugging and monitoring. A real upgrade would be structured JSON logging with async writes (e.g. pino), but that's a separate initiative, not a quick fix.

---

## 3. ~~Fix double rate limiting~~ (investigated — intentional design)

**Status:** SKIPPED

**Problem:** Initially appeared that authenticated routes hit two rate limiters. After investigation, these are **separate buckets by design**:

- Global: IP-keyed at 60/min — protects against IP-level abuse
- Auth: userId-keyed at 120/min — per-user fairness, separate bucket

Multiple users behind the same IP each get their own 120/min user bucket, while the shared IP is capped at 60/min total. The overhead of two in-memory map lookups per request is negligible. Attempting to consolidate into one limiter required fragile path-based exclusions that would break when adding new API versions.

**Files:** No changes

---

## 4. Cache auth sessions

**Status:** TODO

**Problem:** `auth.api.getSession({ headers })` hits the database on every authenticated request. No caching layer.

**Solution options (from better-auth docs):**

### Option A: `cookieCache` (recommended for single instance)

Session data stored in a signed cookie. Server validates from cookie without DB query. DB only hit when cache expires or on session changes. Works across multiple instances with no extra infra.

```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 min (Lobehub uses 10 min)
  },
}
```

- Encoding strategies: `compact` (default), `jwt`, `jwe` (encrypted)
- Trade-off: revoked sessions stay active on other devices until maxAge expires (same as JWT access tokens)
- Lobehub (74k stars) uses this with 10 min maxAge

### Option B: `secondaryStorage` (for multi-instance / Redis)

External key-value store (Redis, in-memory Map) that better-auth checks before hitting DB. Handles cache lifecycle automatically — writes on login, invalidates on logout.

```typescript
secondaryStorage: redisStorage(), // or createMemoryStorage() for single instance
```

- Better for multi-instance deployments with shared Redis
- Instant revocation (no stale cookie window)
- Lobehub uses both cookieCache + Redis secondaryStorage (3-tier)

### Option C: Both (Lobehub pattern)

cookieCache (10 min) + Redis secondaryStorage + DB fallback. Maximum performance with instant revocation via Redis.

**Files:** `packages/auth/src/index.ts`

---

## 5. ~~Conditionally load OpenAPI/Scalar routes~~ (keeping — API-first platform)

**Status:** SKIPPED

**Problem:** OpenAPI schema generation and Scalar docs served in production. However, this is an API-first platform — production API docs are essential for consumers. The startup cost is one-time and negligible at runtime.

---

## 6. ~~Skip dotenv in production~~ (negligible — one-time startup cost)

**Status:** SKIPPED

**Problem:** dotenv loads `.env` files on import. But it's one-time at startup (not per-request), and `quiet: true` silently skips missing files. Negligible impact.

---

## 7. ~~Drop @arcjet/ip dependency~~ (keeping — handles edge cases)

**Status:** SKIPPED

**Problem:** Initially suggested replacing with `c.req.header('x-forwarded-for')`. But `@arcjet/ip` correctly handles multi-proxy IP chains, provider-specific headers (Cloudflare, Fly, AWS), and spoofing prevention. A naive header read doesn't. Small, focused library worth keeping.

---

## 8. Add API key authentication

**Status:** TODO

**Problem:** Currently only session-based auth (OAuth via GitHub/Google). No way to authenticate API requests programmatically (scripts, CI, server-to-server).

**Fix:** Use better-auth's `@better-auth/api-key` plugin. Provides key creation, verification, rate limiting per key, expiration, metadata, and org-level keys. Requires:

1. `bun add @better-auth/api-key`
2. Add `apiKey()` plugin to `betterAuth()` config
3. Run `bunx auth migrate` for new DB tables
4. Add `apiKeyClient()` to client config
5. Wire up API key verification in `authMiddleware` as fallback when no session cookie is present

**Files:** `packages/auth/src/index.ts`, `api/hono/src/middlewares/auth.ts`, `packages/auth/package.json`

---

## 9. Fix security audit vulnerabilities

**Status:** DONE

**Problem:** `bun audit --level high` reported 2 high (kysely MySQL SQL injection) and 1 moderate (esbuild dev server). kysely `0.28.13` was installed but `0.28.14` has the fix. esbuild `<=0.24.2` was installed but `0.25.0+` is patched.

**Fix:** Added `overrides` in root `package.json` to force patched versions:

```json
"overrides": {
  "kysely": "^0.28.14",
  "esbuild": "^0.25.0"
}
```

**Notes:** Both vulnerabilities are MySQL-specific (we use PostgreSQL) and esbuild is dev-only, so neither affected production. But overrides ensure clean audit for CI.

**Files:** `package.json`
