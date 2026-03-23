# bun audit

> bun audit --audit-level high

Current status: **Clean** (no high or critical vulnerabilities as of 2026-03-24).

## Active overrides and pins

- `kysely` — overridden to `^0.28.14` (fixes MySQL SQL injection, GHSA-8cpq-38p9-67gx, GHSA-fr9j-6mvq-frcv). Transitive dep from better-auth and drizzle-orm. Does not affect this project (PostgreSQL only).
- `fumadocs-core`, `fumadocs-ui` — pinned to `16.7.1`. Versions `16.7.2`–`16.7.5` introduce a breaking change causing "Element type is invalid" errors during static page generation.

## Resolved

- `esbuild` — Moderate vulnerability (GHSA-67mh-4wv8-2f99, dev server only) no longer flagged. Was a dev-only dep not shipped to production.
