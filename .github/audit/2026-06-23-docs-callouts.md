# Documentation Callouts Audit, 2026-06-23

Surveyed all 29 public docs under `web/next/content/docs/**` (four parallel passes) for places a Fumadocs `<Callout>` alert block improves the reader experience: existing note/warning blockquotes to convert, and buried prerequisites, warnings, destructive-op cautions, and high-value tips to surface. Applied conservatively (callouts lose their value when overused), so most docs get one or two and several get none. `<Callout>` is auto-available via `defaultMdxComponents` (no import). Types used: `info` (note / FYI / rationale), `warn` (prerequisite / gotcha / caution), `error` (data-loss / exposure).

## Applied (18 files)

### Getting started

- **setup.mdx**: `warn` Prerequisites (Bun 1.3.10+, Docker for `--db`, PostgreSQL); `warn` push `canary`+`main` together (`main` must exist when `canary` is pushed); converted the `INTERNAL_API_URL`/`HONO_PORT` note to `info`.
- **architecture.mdx**: "Important for AI Assistants" to `info`.
- **roadmap.mdx**: both "Important for AI Assistants" blockquotes to `info` (the "Available now" navigation blockquotes were left as-is).
- **scripts.mdx**: `warn` `bun run clean` deletes `node_modules` and generated typedefs.
- **contributing.mdx**: `warn` PRs target `canary`, not `main`.
- **type-safe-api.mdx**: `info` `/api/auth/*` is a raw Better Auth handler, not RPC-typed.

### Manage

- **analytics.mdx**: region/host note to `info`; `info` the starter does not call `capture`/`identify` by default.
- **api-conventions.mdx**: `warn` error detail surfaces only in local; `warn` API-key rate-limit tier is unwired.
- **authentication.mdx**: `warn` "no sign-in options configured" ship-blocker; `warn` 5-minute cookie-cache revoke delay.
- **blog.mdx**: `info` `publishedAt` is publish consent; `warn` never hand-edit generated `meta.json`.
- **code-quality.mdx**: skip-hooks warning to `warn`; `warn` local build validates the real `.env` (differs from CI).
- **database.mdx**: `warn` foreign keys CASCADE on delete.
- **documentation.mdx**: `warn` `meta.json` is generated and git-ignored.
- **environment.mdx**: server-vs-client secrets "Important" to `warn`; `warn` `runtimeEnv` mapping is mandatory.
- **og-images.mdx**: unpublished-OG-exposure warning to `error`; the `/og` rationale note to `info`; the takumi `display: flex` note to `warn`.
- **release.mdx** (earlier in this PR): read-write workflow perms + push-both prerequisites as `warn`.
- **theming.mdx**: `warn` `shadcn:update` wipes `ui/` (overrides live in `shadcn-customize.ts`).

### Deployment

- **docker.mdx**: PostgreSQL-only note to `warn`; `warn` Docker images do not auto-run migrations.
- **vercel.mdx**: `warn` build-time `POSTGRES_URL` for prod/canary; two-separate-projects "Important" to `warn`.

## No callouts (deliberate)

`index`, `project-structure`, `dashboard`, `feedback`, `llms-txt`, `robots`, `sitemap`, `resources/ai-skills`, `resources/ide-setup`, `resources/infisical`: reference or descriptive content with no genuine prerequisite, hazard, or high-value tip. Navigation "see also" / "Available now" blockquotes were left as blockquotes everywhere (they are links, not alerts).

## Method

Four read-only survey agents proposed conservative candidates; four edit agents applied the agreed set; `bun run build` compiled all MDX. Where a callout duplicated nearby prose, the redundant sentence or prefix was trimmed.

## Also in this PR

CLI `init` next-steps: `bun dev` to `bun run dev` (consistency with `bun run db:migrate`).
