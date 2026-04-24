# AGENTS.md

Guidance for humans and AI coding agents working in this repo.

## Documentation

Canonical docs live in Fumadocs at `web/next/content/docs/**`. They are published with AI-friendly endpoints — **fetch these before making non-trivial changes**:

- **Index:** <https://zerostarter.dev/llms.txt>
- **Full docs, one page:** <https://zerostarter.dev/llms-full.txt>
- **Any page as plain text:** append `.md` or `.txt` to a docs URL (e.g. `/docs/manage/database.md`).

Locally the same endpoints are served by `bun dev` at `NEXT_PUBLIC_APP_URL` (route: `web/next/src/app/(llms.txt)/`). If you can't reach the hosted site and dev isn't running, read the MDX directly under `web/next/content/docs/`.

### Where to look (by intent)

**Orient yourself**

- `/docs` — landing page and doc map
- `/docs/getting-started/project-structure` — what lives where
- `/docs/getting-started/architecture` — tech stack and data flow
- `/docs/getting-started/setup` — local bootstrap
- `/docs/getting-started/scripts` — every `bun run <x>` explained
- `/docs/getting-started/roadmap` — what's planned

**Build features**

- `/docs/getting-started/type-safe-api` — Hono RPC client used from `web/next`
- `/docs/manage/api-conventions` — response shape, error shape, OpenAPI metadata for new routes
- `/docs/manage/authentication` — better-auth wiring, protected routes, sessions
- `/docs/manage/database` — drizzle schema + migration workflow
- `/docs/manage/environment` — `@packages/env` per-surface entrypoints
- `/docs/manage/dashboard` — auth-gated app surface in `web/next`
- `/docs/manage/theming` — tokens and tailwind conventions
- `/docs/manage/feedback` — userjot integration
- `/docs/manage/analytics` — PostHog

**Publish content**

- `/docs/manage/documentation` — how this Fumadocs site is authored
- `/docs/manage/blog` — blog MDX pipeline
- `/docs/manage/og-images` — takumi-js OG route patterns
- `/docs/manage/sitemap` — auto-generated sitemap
- `/docs/manage/robots` — crawler rules
- `/docs/manage/llms-txt` — AI-friendly docs endpoint

**Ship & maintain**

- `/docs/manage/code-quality` — oxlint, oxfmt, typecheck, lefthook
- `/docs/manage/release` — changelog + versioning workflow
- `/docs/deployment/vercel` — Vercel config (`web/next/vercel.json`, `api/hono/vercel.json`)
- `/docs/deployment/docker` — Dockerfile + compose flow
- `/docs/contributing` — contribution rules

**Tooling context**

- `/docs/resources/ide-setup` — recommended editor config
- `/docs/resources/ai-skills` — how custom skills fit in
- `/docs/resources/infisical` — secret management

## House rules

- Don't comment unnecessarily. Only when the _why_ is non-obvious.
- Use `@/*` for intra-workspace imports (maps to `./src/*`).
- Never pin third-party versions in a workspace `package.json`; use `"catalog:"`. The root catalog is managed automatically by `.github/scripts/deps-manager.ts` on `bun install`.
- Never touch `process.env` outside `@packages/env`; import the typed `env` from the matching entrypoint (`@packages/env/api-hono`, `/db`, `/auth`, `/web-next`).
- Commits follow Conventional Commits (enforced by `commitlint`).

## Skills

Custom skills live in `.agents/skills/` (`.claude/skills` and `.github/skills` are symlinks into it). Each skill is a `SKILL.md` with YAML frontmatter (`name`, `description`) and a markdown body. See `/docs/resources/ai-skills` for authoring guidance.

**Shipped skills:**

- `docs` — how to read the Fumadocs site and keep every sync-point (`meta.json`, sidebar config, `index.mdx`, README, etc.) coherent when pages or features change. Load this any time you're editing content under `web/next/content/**` or changing a feature described in the docs.

Add more skills only when you notice yourself giving an agent the _same_ multi-step instructions across sessions. Otherwise, put the knowledge in the docs — it stays in sync with the product.
