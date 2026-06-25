# Documentation Audit, 2026-06-21

Full audit of every page under `web/next/content/docs/**` (29 pages, plus the private `content/console/docs/**` collection) against the actual code. Six areas were audited in parallel, each cross-referencing the docs against the real implementation; every candidate fix was then verified before acting. The fixes were applied in the same change as this report.

Overall: the docs were recently audited and are largely accurate. Most findings are precision or omission issues; a handful are real errors. `roadmap.mdx`, `llms-txt.mdx`, and `resources/ai-skills.mdx` needed the most work.

## Method note / correction

One audit-pass claim was wrong and is corrected here: `.claude/skills/` **does exist** and mirrors `.agents/skills/` (both hold the same 11 skills). The repo ships 11 skills total: `agent-browser`, `api-endpoint`, `audit`, `db-migration`, `dev`, `docker-test`, `fonts`, `gh-commit`, `github-pull-request-review`, `ignore-sync`, `shadcn-sync`. Only `agent-browser` is externally vendored (tracked in `skills-lock.json`).

## Getting Started

- **roadmap.mdx** (biggest): understated the product. PostHog was referenced in the closing note but had no in-body section; admin console + roles, rate limiting, OG images, llms.txt/llms-full.txt, and SEO routes were all shipped but absent. Added "already implemented" coverage for these; kept the genuinely-planned items (AI SDK, Inngest/Trigger.dev, Resend/SendGrid, i18n, Stripe/Lemon Squeezy/Paddle/Razorpay/Polar/etc.) as planned; rescoped the "not implemented" framing to the planned section.
- **architecture.mdx**: `/api/docs` is the Scalar UI; the OpenAPI spec is `/api/openapi.json`. Added missing stack entries (admin/roles, rate limiting, OG images, TanStack Form, Base UI primitives, llms-full.txt); clarified tsdown bundles backend packages while web uses Turbopack.
- **project-structure.mdx**: `packages/config/src/site.ts` (the single rebrand source) was never mentioned; `definePackageConfig` is at `packages/config/tsdown.ts`, not `src/`. Added the `admin` Better Auth plugin to the auth bullets.
- **type-safe-api.mdx**: the Client Configuration snippet had a comment not in source; the "new route" example was untyped. Typed it as `Hono<{ Variables: Session }>`. (`@hono/standard-validator` stays: it is the documented validation tool.)
- **scripts.mdx**: `build:vercel` is a turbo task, not a root `bun run` script; the tsdown then `bun build --external hono` then `vercel-bundle/` flow was imprecise. Added the missing `console:roles` script.
- **setup.mdx**: minor (Bun floor to 1.3.10; note INTERNAL_API_URL/HONO_PORT). **index.mdx**: accurate.

## Auth & Data

- **authentication.mdx**: named the `.github/scripts/console-roles.ts` helper; aligned the rate-limit section with api-conventions (the API-key tier is currently unwired; documented the random-UUID fallback).
- **dashboard.mdx**: the dashboard layout passes only `header` + `footer` (not `badge`, which is the console's); clarified the shell anatomy; marked `settings/` as illustrative.
- **database.mdx**: added `impersonatedBy` (session) and `teamId` (invitation) to the column lists; annotated that the admin-plugin fields arrive in migration 0003.
- **api-conventions.mdx**: typed the "new route" example; added the `AGENTS_LOGIN_FAILED` code and the `/api/auth/get-session` note.

## Ops & Quality

- **analytics.mdx**: replaced a fabricated `providers.tsx` snippet with the real structure; fixed the `.env` comment; flagged the usage examples as generic SDK guidance.
- **code-quality.mdx**: `LEFTHOOK=0` disables all hooks (use `LEFTHOOK_EXCLUDE=<name>` for one); added the CI env flags (`NODE_ENV=production`, `SKIP_ENV_VALIDATION=true`); added `.oxlintrc.jsonc`; corrected the commit-types count to 11 (config-conventional adds `build` and `revert`).
- **environment.mdx**: added the mandatory `runtimeEnv` step (a real functional gap); noted the `globalEnv` exception for `NEXT_PUBLIC_NODE_ENV`; documented the `@packages/env` index exports (is\* checkers, `getSafeEnv`, build-version helpers).
- **release.mdx**: added the feature-PR squash-to-canary convention and a production-deployment section (Vercel + `migrate-on-deploy.ts` gating + build-time POSTGRES_URL).

## Content & UI

- **documentation.mdx**: noted the three Fumadocs collections (docs, blog, console) and that `console` is private (excluded from public search/sitemap/llms).
- **feedback.mdx**: fixed the `.env` comment; corrected the user-menu placement (Feedback sits above Log out); noted the docs footer also shows the version; clarified the UserJot mapping.
- **theming.mdx**: added `--font-heading`; fixed a fence tag; expanded the shadcn-customize mechanism (shadcn:update wipes `ui/`, `shadcn-customize.ts` re-applies overrides).
- **og-images.mdx**: corrected the `outputFileTracingIncludes` claim to be Linux- and libc-conditional; added the `public/og/home.png` static fast path; clarified `section` (query key) vs `sectionName` (arg); warned about time-gated (blog) OG gating.
- **blog.mdx**: accurate (minor empty-state note).

## SEO & Deployment

- **llms-txt.mdx** (real errors): the top-level `/blog.md`, `/docs.md` forms 404; only `/docs/<path>.md|.txt` and `/blog/<path>.md|.txt` are rewritten, plus the index routes `/llms.txt`, `/llms.txt/docs`, `/llms.txt/blog`, `/llms-full.txt`. Documented the `llms-full.txt` route + preamble, the processed-to-raw fallback, the `decodeHTML` step, and the console-docs exclusion.
- **vercel.mdx**: the backend build command was stale (missing `migrate-on-deploy.ts`). Added a migrations-on-deploy section (gated on `VERCEL_ENV=production`/`ref=canary`) and `NEXT_PUBLIC_NODE_ENV`.
- **docker.mdx**: removed the invented `.env.production` example; pointed env at `.env.example`; added image internals (bun-alpine, multi-stage, non-root, standalone) and the "Docker does not auto-migrate" caveat.
- **sitemap.mdx**: reattributed the blog-index exclusion to `getPublishedBlogPosts()`; added the force-static/revalidate note. **robots.mdx**: accurate (added a "no noindex" note).

## Resources, Contributing & Console

- **ai-skills.mdx** (badly out of date): documented a fictional `turbo` skill and listed only 2 of 11. Replaced with all 11 real skills, fixed the structure tree, and corrected the skills-location framing (both `.agents/skills` and `.claude/skills` exist and are mirrored).
- **contributing.mdx**: corrected the commit-types count to 11; clarified the `bun audit` pre-commit hook is canary-only (always in CI).
- **infisical.mdx**: added a "how this repo uses Infisical" section (the committed `.infisical.json` + `workspaceId`); fixed "Project ID" to `workspaceId`.
- **ide-setup.mdx**: `bunx oxlint` to `bun run lint`.
- **console/docs/index.mdx**: added the local AgentZero admin-access note; corrected the "user-management dashboard" claim (not built yet; use the `console:roles` CLI or SQL); noted the POSTGRES_URL prerequisite. The incident-response runbook is an accurate placeholder.

## Remaining / out of scope

- `infisical.mdx` ships a personal Railway referral link; flagged for the future fork-strip (init) inventory, not changed here.
- The console runbook and the example blog posts are starter sample content (strip-at-init), not accuracy issues.
