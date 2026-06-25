# Custom-content inventory (for the init / fork-sync)

Date: 2026-06-20. Branch: `feat/brand-config`. Purpose: every location holding zerostarter-specific custom content the init must **swap / replace / strip / rewrite**, vs generic scaffolding to **keep**. No edits here, inventory only.

Marker sweep used: `zerostarter | nrjdalal | neeraj | dalal | agentzero | discord.gg | x.com/ | saas starter` (excludes node_modules/.next/dist/.turbo/bundle/lockfile).

## A. Brand identity, SWAP (already centralized, Phases 1-2)

- `packages/config/src/site.ts`, `name`, `description`, `tagline`, `social.{github,x,discord}`, `agent.{name,email}`. The one file a fork edits; code reads from it. Also feeds the dynamic surfaces (E).

## B. Marketing / personal pages (code), REPLACE or DELETE

- `web/next/src/app/page.tsx`, marketing landing (testimonials, "Why ZeroStarter", `cd zerostarter`, "100+ developers"). REPLACE with generic home.
- `web/next/src/app/hire/page.tsx`, personal "hire me" page. DELETE.
- `web/next/src/app/resume/page.tsx`, personal résumé; hardcodes personal repos (rdt-li, shadcn-ui-snippets, smart-registry, onset, karabiner-human-config, gitpick) + bio. DELETE.

## C. Blog content, STRIP all, keep 1 format anchor

All posts are personal/starter content; a product writes its own.

- `a-biography-written-in-code.mdx`, the author's personal essay. STRIP.
- `web-development-2026.mdx`, opinion piece + heavy ZeroStarter promo. STRIP.
- `mcp-per-workspace.mdx`, long-form technical post. **ANCHOR** (best blog format template: sections, SVG diagrams, code, numbered steps); keep structure, replace content. Its `public/blog/mcp-per-workspace/images/*.svg` ride along until the content is replaced.
- `blog/index.mdx`, landing copy → GENERICIZE. `blog/meta.json`, UPDATE to the anchor set.

## D. Docs content, STRIP (starter/dev-meta), keep 1 format anchor

Re-audited through the product lens (subagent classification, tightened): ~all docs document the STARTER's own stack / tooling / setup / wiring (self-documenting). A product publishes ITS OWN docs, so the init strips the starter docs and keeps one as a format anchor. Matches the fork-sync "drop starter docs, keep one sample" rule. **NOT keep-and-de-brand as I first assumed.**

- `web/next/docs.config.ts`, docs structure + metadata source (now reads `site.name`, so naming auto-rebrands). The init regenerates the structure for the product's own doc set.
- `getting-started/*` (architecture, project-structure, setup, scripts, type-safe-api, roadmap), the starter's structure/setup/stack. STRIP.
- `manage/*` (16: auth, database, dashboard, api-conventions, environment, code-quality, blog, documentation, release, og-images, llms-txt, robots, sitemap, analytics, feedback, theming), the starter's subsystem wiring/tooling. STRIP. (`analytics` / `feedback` / `theming` / `resources/infisical` are generic-integration guides a fork MAY retain as INTERNAL dev reference, but default-strip from public docs.)
- `deployment/{docker,vercel}.mdx` (starter-specific deploy), `resources/{ai-skills,ide-setup,infisical}.mdx` (starter dev resources), `contributing.mdx` (contributing to the starter), STRIP.
- `docs/index.mdx`, docs landing. **ANCHOR** (keep one doc as the product's docs entry / format template; content replaced).
- Console: `console/docs/index.mdx`, STRIP; `runbooks/incident-response.mdx`, **ANCHOR** (generic runbook template); `meta.json`, UPDATE.

Net: of ~35 content pages the vast majority STRIP; anchors = 1 doc + 1 blog + 1 console runbook; no meaningful default-KEEP (the looser "generic integration" docs are at most optional internal dev reference).

## E. Dynamic content surfaces, mostly config-driven, EXCEPT a hardcoded starter-meta preamble

Name/description/URL bits are config-driven (from `site` + env) and auto-rebrand. But one surface carries hardcoded **starter dev-meta** a product fork must NOT expose:

- `(llms.txt)/llms-full.txt/route.ts`, the ~85-line preamble (monorepo layout, workspace imports, tech stack, project rules) is now **extracted to `site.llmsFullPreamble`** (injectable) and rewritten to match the current stack. A fork overrides it via config (set its own, or empty it) rather than editing route code. Likewise the OpenAPI reference description → `site.apiReferenceDescription`. So these are config-injectable now, not route edits.
- `(llms.txt)/llms.txt/[[...slug]]/route.ts`, header + index; name/description from `site`. Generic structure, KEEP (config-driven).
- `web/next/src/lib/llms.ts`, `getLLMText` wrapper. Generic, KEEP.
- `web/next/src/app/sitemap.ts`, `web/next/src/app/robots.ts`, `config.app.url` + doc/blog URLs. Config-driven, KEEP.
- `web/next/src/app/og/{route,home/route,docs/[[...slug]]/route,blog/[[...slug]]/route}.tsx` + `web/next/src/lib/og-image.tsx`, render `site.name`. Config-driven, KEEP.

zerostarter keeps the preamble; the init strips it for product forks. **General principle:** "generic to the starter" is not the same as "keep for a product", starter dev-meta (stack/conventions) is still strip/replace at init. This likely also applies to parts of the **Manage docs (D)** that describe the starter's own tooling, revisit.

## F. Assets

- `web/next/public/og/home.png`, pre-rendered BRANDED OG fallback, REPLACE.
- Favicon / app icon, REPLACE (confirm path: `web/next/src/app/{icon,favicon}*` or layout `icons` metadata).
- `web/next/public/landing/*.svg|png` (32 third-party tech logos: next/bun/hono/drizzle/…), generic; KEEP if the new landing keeps a tech section, else prune with `page.tsx`.
- `web/next/public/{file,globe,window,next,vercel}.svg`, create-next-app demo svgs, likely unused; PRUNE.
- `web/next/public/graph-build.svg` + `.github/assets/graph-build.svg`, per-repo dependency-graph (CI-regenerated; embeds "zerostarter" node label), DROP (fork regenerates).

## G. Config / meta / infra, SWAP identity

- `package.json` (root), `name`, `homepage`, `bugs`, `repository`, `funding`, `author` (8 refs).
- `README.md`, full zerostarter readme (32 refs), REWRITE.
- `LICENSE.md`, "Copyright (c) 2025 Neeraj Dalal".
- `.github/FUNDING.yml`, `github: nrjdalal`.
- `.github/rulesets/{main,canary}.json`, `"source": "nrjdalal/zerostarter"`.
- `.github/scripts/changelog-manager.ts` (101-102), fallback `repoOwner="nrjdalal"`, `repoName="zerostarter"`.
- `.github/scripts/build-sizes.ts` (104, 113), dep-graph root label "zerostarter".
- `docker-compose.yml` (1), `name: zerostarter`.
- `.env.example` (29, 33), two `zerostarter.dev` doc-link comments.
- `.infisical.json`, `workspaceId` (fork's secrets vault), fork-specific.
- KEEP (generic): `web/next/vercel.json`, `api/hono/vercel.json`, workspace package names `@web/next` / `@api/hono` / `@packages/*` (rescope only if desired).

## H. Agent / meta docs & skills, fork edits or regenerates

- `AGENTS.md` / `CLAUDE.md`, `AgentZero`, `agent@zerostarter.dev`, "ZeroStarter".
- `.agents/skills/*/SKILL.md`, `dev` (ZeroStarter dev stack desc + log paths), `fonts`, `docker-test` mention ZeroStarter.

## I. Misc code comment

- `web/next/src/components/mode-toggle.tsx:12`, `/* The smart toggle by @nrjdalal */` author attribution.

## J. Generated, DO NOT port

- `CHANGELOG.md` (666 refs), fork regenerates its own.

## Notes

- After Phases 1-2 the **code** reads identity from `@packages/config/site`; remaining custom material is content (B/C/D), assets (F), config/meta (G), and meta-docs (H/I).
- The init's job per category: A,G → swap values; B → replace/delete; C → strip to anchor; D → keep + scrub naming; F → replace/prune; H/I → regenerate/scrub; E,J → automatic.
