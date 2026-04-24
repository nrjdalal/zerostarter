# AGENTS.md

Guidance for humans and AI coding agents working in this repo. `CLAUDE.md` is a symlink to this file, so edits apply to both.

## Documentation

Canonical docs live in Fumadocs at `web/next/content/docs/**`. They publish with AI-friendly endpoints — **fetch these before making non-trivial changes**. Replace `<site>` with the value of `NEXT_PUBLIC_APP_URL` (this project: `https://zerostarter.dev`; forks: whatever you deploy to):

- **Index:** `<site>/llms.txt`
- **Full docs, one page:** `<site>/llms-full.txt`
- **Any page as plain text:** append `.md` or `.txt` to a docs URL (e.g. `/docs/manage/database.md`).

Locally the same endpoints are served by `bun dev` at `NEXT_PUBLIC_APP_URL` (route: `web/next/src/app/(llms.txt)/`). If you can't reach the site and dev isn't running, read the MDX directly under `web/next/content/docs/`.

### Where to look (by section)

- `/docs/getting-started/**` — project structure, architecture, setup, scripts, roadmap, type-safe API
- `/docs/manage/**` — every runtime concern (auth, DB, env, API conventions, analytics, theming, sitemap, robots, llms-txt, OG images, feedback, release, code-quality, docs, blog, dashboard)
- `/docs/deployment/**` — Vercel, Docker
- `/docs/resources/**` — IDE setup, AI skills, Infisical
- `/docs/contributing` — contribution rules

Fetch `<site>/llms.txt` for the current, fine-grained page list — it stays in sync with the site automatically.

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
