# Custom-content inventory (for the init / fork-sync)

Date: 2026-06-20. Branch: `feat/brand-config`. Purpose: every location holding zerostarter-specific custom content the init must **swap / replace / strip / rewrite**, vs generic scaffolding to **keep**. No edits here — inventory only.

Marker sweep used: `zerostarter | nrjdalal | neeraj | dalal | agentzero | discord.gg | x.com/ | saas starter` (excludes node_modules/.next/dist/.turbo/bundle/lockfile).

## A. Brand identity — SWAP (already centralized, Phases 1-2)

- `packages/config/src/site.ts` — `name`, `description`, `tagline`, `social.{github,x,discord}`, `agent.{name,email}`. The one file a fork edits; code reads from it. Also feeds the dynamic surfaces (E).

## B. Marketing / personal pages (code) — REPLACE or DELETE

- `web/next/src/app/page.tsx` — marketing landing (testimonials, "Why ZeroStarter", `cd zerostarter`, "100+ developers"). REPLACE with generic home.
- `web/next/src/app/hire/page.tsx` — personal "hire me" page. DELETE.
- `web/next/src/app/resume/page.tsx` — personal résumé; hardcodes personal repos (rdt-li, shadcn-ui-snippets, smart-registry, onset, karabiner-human-config, gitpick) + bio. DELETE.

## C. Blog content — STRIP (keep ≥1 generic anchor)

- `web/next/content/blog/a-biography-written-in-code.mdx` (personal) — DELETE.
- `web/next/content/blog/mcp-per-workspace.mdx` (personal/tooling) — DELETE.
- `web/next/content/blog/web-development-2026.mdx` (opinion) — DELETE.
- `web/next/content/blog/index.mdx` — blog landing copy — GENERICIZE.
- `web/next/content/blog/meta.json` — lists the 3 posts — UPDATE to anchor set.
- `web/next/public/blog/mcp-per-workspace/images/{chpwd-flow,gh-account-clash,scope-by-path}.svg` — DELETE with the post.

## D. Docs content — KEEP (generic starter docs) but DE-BRAND naming/URLs

- `web/next/docs.config.ts` — SINGLE SOURCE of docs titles/descriptions; 9 "ZeroStarter" refs (index, architecture, project-structure, setup, roadmap, docker, contributing, console intro). De-brand/template here; it syncs into MDX frontmatter via `.github/scripts/docs.ts`.
- `web/next/content/docs/**/*.mdx` — generic starter docs that NAME ZeroStarter / `zerostarter.dev` / repo URLs in prose. Highest: `deployment/docker.mdx` (11), `getting-started/setup.mdx` (7), `getting-started/{roadmap,architecture}.mdx` (4), `contributing.mdx` (4), `resources/ide-setup.mdx` (3), `manage/authentication.mdx` (3), `deployment/vercel.mdx` (3); plus ~1 each across most `manage/*`. KEEP content, scrub naming/links.
- `web/next/content/console/docs/{index,runbooks/incident-response}.mdx` + `meta.json` — "ZeroStarter admin console". KEEP, de-brand.

## E. Dynamic content surfaces — mostly config-driven, EXCEPT a hardcoded starter-meta preamble

Name/description/URL bits are config-driven (from `site` + env) and auto-rebrand. But one surface carries hardcoded **starter dev-meta** a product fork must NOT expose:

- `(llms.txt)/llms-full.txt/route.ts` — **~85-line hardcoded preamble**: monorepo structure, workspace import examples, canonical tech stack, and project rules (no-semicolons, Drizzle migrations, env conventions). This is starter onboarding meta — fine on `zerostarter.dev` (a dev tool), wrong for a product's `llms-full`. **INIT: replace with a minimal product header** (`site.name`/`site.description` + the scanned docs/blog). Largely redundant anyway with the architecture/project-structure docs already scanned in. NOT config to centralize — strip/replace at init.
- `(llms.txt)/llms.txt/[[...slug]]/route.ts` — header + index; name/description from `site`. Generic structure, KEEP (config-driven).
- `web/next/src/lib/llms.ts` — `getLLMText` wrapper. Generic, KEEP.
- `web/next/src/app/sitemap.ts`, `web/next/src/app/robots.ts` — `config.app.url` + doc/blog URLs. Config-driven, KEEP.
- `web/next/src/app/og/{route,home/route,docs/[[...slug]]/route,blog/[[...slug]]/route}.tsx` + `web/next/src/lib/og-image.tsx` — render `site.name`. Config-driven, KEEP.

zerostarter keeps the preamble; the init strips it for product forks. **General principle:** "generic to the starter" is not the same as "keep for a product" — starter dev-meta (stack/conventions) is still strip/replace at init. This likely also applies to parts of the **Manage docs (D)** that describe the starter's own tooling — revisit.

## F. Assets

- `web/next/public/og/home.png` — pre-rendered BRANDED OG fallback — REPLACE.
- Favicon / app icon — REPLACE (confirm path: `web/next/src/app/{icon,favicon}*` or layout `icons` metadata).
- `web/next/public/landing/*.svg|png` (32 third-party tech logos: next/bun/hono/drizzle/…) — generic; KEEP if the new landing keeps a tech section, else prune with `page.tsx`.
- `web/next/public/{file,globe,window,next,vercel}.svg` — create-next-app demo svgs — likely unused; PRUNE.
- `web/next/public/graph-build.svg` + `.github/assets/graph-build.svg` — per-repo dependency-graph (CI-regenerated; embeds "zerostarter" node label) — DROP (fork regenerates).

## G. Config / meta / infra — SWAP identity

- `package.json` (root) — `name`, `homepage`, `bugs`, `repository`, `funding`, `author` (8 refs).
- `README.md` — full zerostarter readme (32 refs) — REWRITE.
- `LICENSE.md` — "Copyright (c) 2025 Neeraj Dalal".
- `.github/FUNDING.yml` — `github: nrjdalal`.
- `.github/rulesets/{main,canary}.json` — `"source": "nrjdalal/zerostarter"`.
- `.github/scripts/changelog-manager.ts` (101-102) — fallback `repoOwner="nrjdalal"`, `repoName="zerostarter"`.
- `.github/scripts/build-sizes.ts` (104, 113) — dep-graph root label "zerostarter".
- `docker-compose.yml` (1) — `name: zerostarter`.
- `.env.example` (29, 33) — two `zerostarter.dev` doc-link comments.
- `.infisical.json` — `workspaceId` (fork's secrets vault) — fork-specific.
- KEEP (generic): `web/next/vercel.json`, `api/hono/vercel.json`, workspace package names `@web/next` / `@api/hono` / `@packages/*` (rescope only if desired).

## H. Agent / meta docs & skills — fork edits or regenerates

- `AGENTS.md` / `CLAUDE.md` — `AgentZero`, `agent@zerostarter.dev`, "ZeroStarter".
- `.agents/skills/*/SKILL.md` — `dev` (ZeroStarter dev stack desc + log paths), `fonts`, `docker-test` mention ZeroStarter.

## I. Misc code comment

- `web/next/src/components/mode-toggle.tsx:12` — `/* The smart toggle by @nrjdalal */` author attribution.

## J. Generated — DO NOT port

- `CHANGELOG.md` (666 refs) — fork regenerates its own.

## Notes

- After Phases 1-2 the **code** reads identity from `@packages/config/site`; remaining custom material is content (B/C/D), assets (F), config/meta (G), and meta-docs (H/I).
- The init's job per category: A,G → swap values; B → replace/delete; C → strip to anchor; D → keep + scrub naming; F → replace/prune; H/I → regenerate/scrub; E,J → automatic.
