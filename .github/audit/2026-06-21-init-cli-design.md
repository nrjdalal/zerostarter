# `zerostarter` CLI: Design (2026-06-21)

> **Status: superseded / aspirational planning.** The shipped CLI took a deliberately simpler path than this plan: whole-directory removals + bundled template stubs + literal-string edits. There is **no `doctor` command, no ts-morph AST edits, and no token sweep**. For the actual shipped behavior see `packages/cli/src/convert.ts`. This document is kept for the original design rationale.

A thorough plan for `zerostarter`, a CLI that turns a fresh zerostarter scaffold into a clean product (`init`) and re-baselines existing forks on upstream (`sync`). It automates the strip/swap/replace work, verified file-by-file in the swap manifest below.

Grounded in two studies: the verified swap manifest (exact files/lines), and the conventions of the author's own published CLI, `inscope` (`github.com/nrjdalal/inscope`), which is the build model.

## 1. Goal and scope

- **`init`**: the one-time conversion of a fresh zerostarter clone into a blank product canvas. Keep the engineering (monorepo, auth, db, API, tooling); drop everything that is zerostarter-the-product (landing, content, branding, dev-meta).
- **`sync`**: re-baseline an already-converted fork on zerostarter's later changes, preserving the product and pruning starter-only artifacts (this is what the `fork-sync` skill, PR #480, does manually).
- Supersedes the manual `init` skill (PR #503): the CLI replaces it.

## 2. Name and invocation (decided)

- Package and bin: **`zerostarter`** (unscoped, single word), matching the `inscope` convention. Not `create-zerostarter`.
- Run via `bunx zerostarter <command>` (or `npx zerostarter`).
- Commands:
  - `zerostarter init [dir]`: scaffold a new product from zerostarter into `dir` (default `.`), then convert it. The dir name becomes the project name. If `dir` is omitted or `.` and the current directory is not empty, it prompts for a dir name instead of scaffolding over existing files.
  - `zerostarter sync`: re-baseline a fork on upstream (absorbs the fork-sync skill).
  - `zerostarter doctor`: optional health check (leftover upstream branding, missing env scope, etc.).
  - Global: `-v/--version`, `-h/--help`, `-y/--yes` (non-interactive), `--dry-run`.

`init` fetches the latest zerostarter into the target dir (via gitpick), converts it, and `git init`s a clean history: one command, no separate scaffold step (which is why there is no `new`). `sync` is the only other command, for re-baselining an existing fork.

## 3. Build conventions (from inscope)

The CLI mirrors inscope so it matches the author's established taste and reuses the same toolchain as zerostarter:

- **Almost zero runtime deps.** Arg parsing via `node:util` `parseArgs` + a hand-rolled `switch` dispatch; prompts hand-rolled on `node:readline`; TTY-gated ANSI color, no chalk. The one runtime dependency is **ts-morph**, for AST-precise edits of TS files (the same tool zerostarter uses in `shadcn-customize.ts`); JSON files (`package.json`, `.infisical.json`) are edited by parse and re-serialize.
- **Single unscoped bin**, pure ESM (`"type": "module"`), `#!/usr/bin/env node` shebang authored in the bin entry. Dual-purpose: a `bin` and an importable `exports` library.
- **Build with tsdown** (two configs: library entry + bin entry), minified ESM into `dist/`, Node target, Bun for dev.
- **Toolchain identical to zerostarter and inscope**: oxlint, oxfmt, lefthook, commitlint + config-conventional, changelogen, conventional commits, manual version bump then CI publish + tag.
- **Reused patterns**: pure-render + apply generators with golden snapshot tests; atomic writes (temp + rename, preserve mode); flags-vs-interactive gating (a provided flag suppresses its prompt; `-y` and non-TTY force defaults); a read-only `--dry-run`/`diff` preview; a `doctor` health check; "Next steps" output after every mutating run.
- **Scaffolder additions inscope lacks** (we add): fetching the template (gitpick), `git init`, ts-morph edits for TS files, dropping bundled text templates for the stripped surfaces, and a final scoped find/replace.

## 4. Distribution and repo

- A workspace **inside the zerostarter monorepo at `packages/cli`** (package name `zerostarter`), picked up by the existing `packages/*` glob (no `workspaces` change), and published to npm from there.
- Why in-repo: the CLI's swap manifest is tightly coupled to zerostarter's file layout, so co-locating them means one PR updates the template and the CLI together (no drift, the same reason the `init`/`fork-sync` skills live in-repo). It reuses the monorepo's catalog, shared TS/tsdown configs, lint/format, and CI.
- It ships in a fresh gitpick like the skills do, and `init` strips `packages/cli` from a converted fork (forks invoke the published `bunx zerostarter`, not the source). The npm package version is independent of the site/template version.

## 5. The conversion engine (verified swap manifest)

Four classes of work. Class 1 edits the load-bearing config in place: TS files (`site.ts`, the navbar entry) via **ts-morph** (navigate to the node, set its value, leave the rest untouched), JSON files by parse and re-serialize. Content, assets, and meta are deletes plus bundled-template drops plus a final scoped find/replace for stragglers.

### Class 1: mechanical swaps (deterministic from a few prompt answers)

| File                                   | What                                                                                                                                                | Driven by                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/config/src/site.ts`          | `name`, `description`, `tagline`, `social.{github,x,discord}`, `agent.{name,email}`; `apiReferenceDescription` and `llmsFullPreamble` reset to `""` | the prompts; the two long blocks default empty (cannot author, must not leak starter dev-meta) |
| `package.json` (root)                  | `name`, `homepage`, `bugs`, `repository`, `funding`, `author`; reset `version` to `0.0.0`                                                           | repoOwner/repoName, author\*, fundingUrl                                                       |
| `LICENSE.md`                           | copyright holder + year                                                                                                                             | licenseHolder, currentYear (system clock)                                                      |
| `.github/FUNDING.yml`                  | `github:` handle, or delete the file                                                                                                                | githubUsername (optional)                                                                      |
| `.github/rulesets/{main,canary}.json`  | `source` = `{owner}/{repo}` (leave `bypass_actors` IDs, they are instance-specific)                                                                 | repoOwner/repoName                                                                             |
| `.github/scripts/changelog-manager.ts` | fallback owner/name (lines 101-102)                                                                                                                 | repoOwner/repoName                                                                             |
| `.github/scripts/build-sizes.ts`       | graph root label (lines 104, 113)                                                                                                                   | repoName                                                                                       |
| `docker-compose.yml`                   | `name:` (line 1)                                                                                                                                    | repoName                                                                                       |
| `.env.example`                         | the two doc-link comments (lines 29, 33)                                                                                                            | appUrl                                                                                         |
| `.infisical.json`                      | new `workspaceId`, or **delete by default** (never carry upstream secrets routing)                                                                  | infisicalWorkspaceId (optional)                                                                |

Config is centralized: editing `site.ts` rebrands every dynamic surface (metadata, OG images, llms.txt header, sitemap, robots, the API reference, and the agent identity that `api/hono/src/routers/agents.ts` reads). Those need no code edits.

### Class 2: content to strip and scaffold (CLI deletes/strips, drops a template, cannot author real copy)

- `web/next/src/app/page.tsx` (804 lines): replace wholesale with a minimal generic home template. Hardcoded brand literals here are not config-driven ("Get ZeroStarter", "Why ZeroStarter", the FAQ, `cd zerostarter`, "@nrjdalal" made-with-love, the social-proof line).
- `web/next/src/app/{hire,resume}/`: delete both route dirs (personal pages).
- **Missed by the inventory** (must handle or the build/nav breaks): remove the `{ href: "/hire", label: "Hire" }` entry from `web/next/src/components/navbar/home.tsx` (line 85), or `/hire` 404s. Optionally prune `caveat` + `newsreader` from `web/next/src/lib/fonts.ts` (used only by hire/resume) and their woff2 files; keep `dmSans` + `jetbrainsMono`.
- Blog (`web/next/content/blog/`): delete `a-biography-written-in-code.mdx` and `web-development-2026.mdx`; keep `mcp-per-workspace.mdx` as the format anchor (strip its content); genericize `index.mdx`; set `meta.json` to `["index", "mcp-per-workspace"]`. Its `public/blog/mcp-per-workspace/images/*.svg` ride along until the content is replaced.
- Docs (`web/next/content/docs/` + `console/docs/`): keep `docs/index.mdx` as the anchor (replace content); delete the rest (`getting-started/*` 6, `manage/*` 16, `deployment/*` 2, `resources/*` 3, `contributing.mdx`); regenerate `docs.config.ts` to the stripped set; set docs `meta.json` to `["index"]`. Console: strip `console/docs/index.mdx`, keep `runbooks/incident-response.mdx` (already generic), its `meta.json` is already minimal.

### Class 3: assets to prune/replace

- Replace `web/next/public/og/home.png` (branded OG fallback; safe to delete, the dynamic `/og/home` route takes over) and `web/next/src/app/favicon.ico` (the only icon; no `icon.*`/manifest exist).
- Delete the create-next-app demo svgs `web/next/public/{file,globe,window,next,vercel}.svg` (verified zero references).
- Delete both dependency-graph svgs: `web/next/public/graph-build.svg` (a manual copy) and `.github/assets/graph-build.svg` (CI regenerates only this one).
- `web/next/public/landing/*` (26 tech logos): keep if the new home keeps a tech strip, else prune together with the `techStack[]` array in `page.tsx`.

### Class 4: meta-docs to scrub (do NOT write through symlinks twice)

`CLAUDE.md` is a symlink to `AGENTS.md`, and `.claude/skills` is a symlink to `.agents/skills`. Edit the real files only.

- `AGENTS.md` (line 16): the `AgentZero` / `agent@zerostarter.dev` local-agent line.
- `.agents/skills/dev/SKILL.md`: "ZeroStarter dev stack" wording, `/tmp/zerostarter-dev.log` paths (lines 13/20/30), `AgentZero` (line 40).
- `.agents/skills/fonts/SKILL.md` (line 8) and `.agents/skills/docker-test/SKILL.md` (line 65, `zerostarter-web` image name).
- `web/next/src/components/mode-toggle.tsx` (line 12): delete the author-attribution comment.
- Remove `.agents/skills/init/` after the run (it is one-time). Keep `fork-sync` for `sync`, or remove if not re-baselining.

### Find/replace stragglers (run only AFTER the Class 2/3 deletes)

Apply most-specific first, and exclude `.agents/skills/{init,fork-sync}/` (intentional upstream refs), `CHANGELOG.md` (never ported), and `.github/audit/`:
`agent@zerostarter.dev` -> agentEmail placeholder; full GitHub/X/Discord URLs -> the derived or placeholder values; `nrjdalal/zerostarter` -> `{owner}/{repo}`; `zerostarter.dev` -> appHost; `AgentZero` -> agentName; `/tmp/zerostarter-dev.log` -> `/tmp/{repoName}-dev.log`; `zerostarter-web` -> `{repoName}-web`; bare `zerostarter` -> repoName. The load-bearing config is handled by Class 1 structured edits; reserve the token sweep for meta-doc/skill stragglers.

## 6. Input: one value, the rest are placeholders

The CLI does not interrogate the user. It takes a single input and leaves everything else as a clear placeholder the user fills in later (in `site.ts` and `package.json`, which are already the one-stop config).

- **The one input**: the target dir, `zerostarter init [dir]` (default `.`). The project name is the dir's base name (`my-product` gives the name "my-product"; `.` uses the current dir's name). If the arg is omitted or `.` and the current directory is not empty, it prompts for a dir name rather than scaffolding over existing files. A single confirm is the only other interaction, and `--yes` skips it.
- **Derived from the input** (the only value the CLI actually sets): the project name, used for `site.name`, the package name, the docker-compose name, the build-graph label, and the changelog fallback. A fresh scaffold has no git remote, so the repository URLs (`package.json` `repository`/`homepage`/`bugs`, `site.social.github`, `rulesets` `source`) become a `your-org/<name>` placeholder until you set a remote.
- **Left as placeholders for the user** (NOT prompted): `site.ts` `description`, `tagline`, `social.x`, `social.discord`, `agent.{name,email}`; `package.json` `author` and `funding`; `LICENSE.md` holder; the `.env.example` doc-link host. Each gets an obvious placeholder (for example `"TODO: your product description"`) so a brand-scan and a glance at `site.ts` show exactly what is left to fill.
- **Emptied, never carried** (starter dev-meta that must not leak): `site.llmsFullPreamble` and `site.apiReferenceDescription` reset to `""`; `.infisical.json` deleted.

So `init` is essentially: `zerostarter init my-product`, and you get a building, de-branded canvas at `./my-product`; fill the details whenever.

## 7. Templates the CLI ships

So the converted tree still builds, the CLI bundles ready text templates under `templates/` and drops them straight in to replace the stripped surfaces: a generic `page.tsx` home, a minimal `README.md`, `docs/index.mdx`, a genericized `blog/index.mdx`, and a placeholder `og/home.png`/`favicon.ico`. A couple of hold-points (the project name, the repo URL) are filled from the input; the rest is static text the user edits later. The templates are golden-snapshot tested.

## 8. Init flow

1. Resolve the target dir (the arg, else `.`). If it is `.` or omitted and the current directory is not empty, prompt for a dir name. Create the dir.
2. Fetch the latest zerostarter into the dir (gitpick `tree/main`); the project name is the dir's base name.
3. Class 1 structured swaps (atomic writes): set the name-derived values, placeholder the rest, empty the dev-meta, delete `.infisical.json`.
4. Class 2 strip + drop templates; fix the navbar; regenerate `docs.config.ts` + `meta.json`.
5. Class 3 assets prune/replace.
6. Class 4 meta scrub; remove the `init`/`fork-sync` skills the product does not need.
7. Find/replace stragglers (scoped, post-delete).
8. `git init` + initial commit (a clean history, not zerostarter's).
9. Verify: `bun install`; `SKIP_ENV_VALIDATION=true bun run build`; brand-scan returns only intentional refs.
10. Print "Next steps" (fill the `site.ts` placeholders, set env, push, deploy).

## 9. Package layout (mirroring inscope)

```
packages/cli/                     (workspace in the zerostarter monorepo)
  bin/
    index.ts                      shebang + parseArgs dispatch + help/version
    commands/{init,sync,doctor}.ts
    commands/_prompt.ts           text/confirm/select primitives (node:readline)
    commands/_git.ts              fetch (gitpick), git init, remote parse  (P1+)
  src/
    manifest.ts                   the swap manifest as data (files, ops, prompt-var map)
    prompts.ts                    gather + detect + validate inputs
    generators/                   pure render: site.ts edit, package.json edit, license, home, readme, docs-index, docs.config
    apply.ts                      orchestrates the classes
    io.ts                         atomic write, safe edit
    scan.ts                       brand-scan / doctor checks
    index.ts                      library barrel
  templates/                      generic home, readme, docs index, blog index
  test/golden.test.ts            snapshot every generator
  tsdown.config.ts  package.json  lefthook.yml ...
```

## 10. Existing PRs disposition

- **#503 (init skill)**: superseded by this CLI. Close it (or reduce to a one-line skill that just points at `bunx zerostarter init`).
- **#480 (fork-sync skill)**: keep for now as the manual fallback; the `zerostarter sync` command automates the same procedure. Once `sync` ships, the skill can become a thin pointer.

## 11. Open decisions (with recommendations)

- **Scope now**: ship `init` first, add `sync` second (porting #480). Recommend this split.
- **Content aggressiveness**: strip to one doc + one blog + one console-runbook anchor with minimal templates (build-green), not a fully blank tree. Recommend the anchor approach.
- **Repo location**: separate repo (recommended) vs a publish-only workspace in zerostarter.

## 12. Implementation phases

- **P0** Scaffold the `zerostarter` package (inscope conventions: tsdown dual build, bin dispatch, `_prompt.ts`, toolchain).
- **P1** Resolve the single input (arg / git remote / dir name) + the placeholder map + validation + `--dry-run`/`--yes`.
- **P2** Class 1 generators (structured config swaps) + golden snapshots.
- **P3** Class 2 content strip + templates + docs.config regeneration.
- **P4** Class 3/4 assets prune + meta scrub + scoped find/replace.
- **P5** Fetch into the dir (gitpick) + `git init` + verify (install/build/brand-scan) + Next steps.
- **P6** `sync` command (port the fork-sync procedure).
- Every phase: golden tests, plus one real end-to-end run against a throwaway clone, brand-scanned to zero.
