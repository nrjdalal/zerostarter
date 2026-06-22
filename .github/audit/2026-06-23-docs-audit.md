# Documentation Audit, 2026-06-23

Follow-up to `2026-06-21-docs-audit.md` (which audited all 29 doc pages and synced them). This pass is scoped to the **delta since that audit**: features merged to `canary` afterward, plus the same stale facts corrected in the `web-development-2026` blog post during this change. The point is to catch drift introduced or missed since 06-21, not to re-audit settled pages.

## Change surface since 2026-06-21

- #530 make GitHub and Google OAuth optional; UI shows only configured providers
- #532 gate the magic-link email field on the plugin being enabled
- #535 `{ data, error }` API response shape (unwrap client + per-route scoped OpenAPI error responses)
- #523 public waitlist signup + `/waitlist` page (new `waitlist` table)
- #505/#516/#529 `zerostarter init` CLI (canonical install is `npx zerostarter@latest init`)
- #517/#519 squashed DB migrations into a single `0000` baseline (now `0000_zero_starter.sql` + `0001_waitlist.sql`)

## Method

A targeted staleness sweep across `web/next/content/docs/**` for known-stale patterns, then a code-cross-checked verification of every doc on the change surface (auth, API, database, env, release, deployment, getting-started, resources). Findings were verified against the real code before acting; fixes were applied in the same change as this report.

Note: the docs are well-maintained because each feature PR updates its own docs in the same change (the "docs must never drift" rule), so per-PR sync plus the 06-21 audit left very little for this pass to find.

## Targeted staleness sweep (all clean)

No occurrences in `docs/**` of any of these stale patterns:

- `bunx gitpick` install (now `npx zerostarter@latest init`)
- stale catalog versions (zod 3.x, hono 4.7.x)
- `.github/reviews/` (now `.github/audit/`)
- release "creates a PR to sync back" (auto-release commits to canary + tags + GH release)
- the old `"An unexpected error occurred"` 500 message (now `"Internal Server Error"`)
- orphaned migration-number references (migrations were squashed; docs already reflect `0000` + `0001`)
- `zValidator` / `@hono/zod-validator` (the repo uses `sValidator` from `@hono/standard-validator`)

## Findings and fixes

### Manage + Deployment (verified against code)

- **`manage/database.mdx`** (the only drift in this set, **fixed**): the Schema section ("9 tables") and the "Existing Migrations" table never picked up PR #523. Added a **Waitlist** subsection documenting the standalone `waitlist` table (`id`, `email` unique, `createdAt`; written by `/waitlist` and `POST /api/waitlist`), reworded the schema intro to cover both `schema/auth.ts` and `schema/waitlist.ts`, and added the `0001_waitlist.sql` row to the migrations table.
- **`manage/api-conventions.mdx`**: accurate. Response envelope, `jsonError`, the error-code table (incl. `BAD_REQUEST` via `HTTPException`, `AGENTS_LOGIN_FAILED`), the `unwrap` `{data,error}` section, the validation `issues` shape, and the per-route scoped error responses (`globalErrorResponses` 429/500 via `defaultOptions`, `authErrorResponses` 401, `validationErrorResponses` 400) all match the code.
- **`manage/authentication.mdx`**: accurate. Conditional `socialProviders` / `enabledSocialProviders` / `enabledProviders`, `magicLinkEnabled` gating, `GET /api/auth/providers`, the `access.tsx` UI gating and empty state, the Admin/organization plugins, and the rate-limit section all match.
- **`manage/environment.mdx`**: accurate. Per-package var lists, the mandatory `runtimeEnv` step, the `globalEnv`/`NEXT_PUBLIC_NODE_ENV` exception, and the `@packages/env` index exports all match.
- **`manage/release.mdx`**: accurate. Correctly describes auto-release committing the changelog + version bump directly to `canary`, tagging, and publishing a GitHub release (not a sync-back PR), plus merge-commit-not-squash and the migrate-on-deploy gating.
- **`manage/code-quality.mdx`**: accurate. `lefthook.yml` (audit canary-only, lint-staged `stage_fixed`, build), `LEFTHOOK=0` vs `LEFTHOOK_EXCLUDE`, CI env flags, and the 11 commit types all match.
- **`deployment/docker.mdx`**: accurate. Compose snippet, build-secret requirement, image internals, and the "Docker images do not run migrations" caveat all match.
- **`deployment/vercel.mdx`**: accurate. Frontend/backend build commands, `migrate-on-deploy.ts` gating, and the env-var lists all match.

### Getting Started + Resources (verified against code)

- **`getting-started/roadmap.mdx`** (**fixed**): "Already Implemented" omitted two features shipped since 06-21. Added a `zerostarter` CLI section (`npx zerostarter@latest init`) and a Public Waitlist section. Left the `{data,error}` shape off the roadmap (it is a convention documented in `type-safe-api.mdx`, not a headline integration).
- **`getting-started/project-structure.mdx`** (**fixed**): the `packages/db/src/schema/` listing omitted `waitlist.ts` (added), and the `packages/auth` bullet said "Supports GitHub and Google OAuth" without noting they are now optional (reworded to cover conditional providers + `GET /api/auth/providers`).
- **`type-safe-api.mdx`, `architecture.mdx`, `scripts.mdx`, `index.mdx`, `contributing.mdx`, `resources/ai-skills.mdx`**: verified accurate. The `unwrap` examples, the `Hono<{ Variables: Session }>` route, the 17 root scripts, the CI gate order, and the 11 skills (mirrored across `.agents/skills` + `.claude/skills`) all match code.

#### Corrected false positive

The audit pass flagged `project-structure.mdx:56` ("a freshly scaffolded fork's home `page.tsx` redirects to `/waitlist`") as inaccurate, having checked the **starter's** `page.tsx` (the marketing landing, no redirect). This is **wrong**: the line is about a **post-`init` fork**, and `packages/cli/src/templates.ts` (`homeTemplate`) + `convert.ts:92` confirm `zerostarter init` rewrites `page.tsx` to `redirect("/waitlist")`. Line 56 is correct and was left unchanged.

## Net

Docs were in good shape (per-PR sync + the 06-21 audit held). Real drift was limited to three pages, all from features that shipped after 06-21:

- `manage/database.mdx`: missing `waitlist` table + `0001_waitlist.sql` migration (#523), fixed.
- `getting-started/roadmap.mdx`: missing the CLI + waitlist from "Already Implemented", fixed.
- `getting-started/project-structure.mdx`: missing `waitlist.ts`; OAuth-optionality not noted, fixed.

The other 23 audited pages were accurate. One flagged item was a verified false positive (left unchanged).

## Related content change

The `web-development-2026` blog post was refreshed in the same change (drift fixes for the same features above, new coverage for the `{data,error}` client + API documentation + rate limiting + multi-tenancy + the CLI, and em-dashes removed). Em-dashes were also removed from `manage/api-conventions.mdx` and `getting-started/type-safe-api.mdx`.
