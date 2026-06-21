# Init template residue audit (2026-06-21)

What is still zerostarter-the-starter / author-specific in a scaffold **after** the
current minimal `init`, and what to do about it.

> **Status:** Tiers 1 and 2 implemented in `packages/cli/src/convert.ts`. After `init`,
> the residual markers are exactly the Tier C set (README, `page.tsx` landing,
> `.env.example` doc links, mode-toggle comment, AGENTS.md), left for the fork to own.

## What `init` already handles (baseline, not residue)

- Removes dirs: `web/next/content`, `web/next/public`, `.agents/skills`, `.claude/skills`, `packages/cli`, `.github/audit`.
- Drops a generic content stub (docs index, blog index + sample, console index, `docs.config.ts`).
- Regenerates `packages/config/src/site.ts` (so every value READ from `site.ts` is already clean, including agent identity, which `api/hono/src/routers/agents.ts` reads via `site.agent.*`, verified centralized, no hardcoding).
- Rewrites the root `package.json` brand fields. Confirmed complete: the 8 leftover marker lines in `package.json` are exactly `name`, `homepage`, `bugs`, `author{name,email,url}`, `repository`, `funding`, all set by `init`. Nothing leaks in `description`/`keywords`/`scripts`.

`.vercel/` is gitignored, so the author's Vercel project link never ships to a fork. No action.

## Method

Three parallel read-only explorers (web frontend / config+infra / api+packages+docs) plus an authoritative `rg --hidden` marker sweep (`zerostarter|nrjdalal|neeraj|dalal|agentzero`) over the tree, excluding the dirs `init` removes and the files it rewrites.

## Findings

### A. Personal / dev-meta files, whole-file removals (fits the "remove dirs" model)

| Path                                                                                                   | What it is                                                                                | Action                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| `web/next/src/app/hire/`                                                                               | The author's hiring/portfolio page (Neeraj Dalal). 21 marker hits.                        | REMOVE                              |
| `web/next/src/app/resume/`                                                                             | The author's resume/CV page. 19 marker hits.                                              | REMOVE                              |
| `web/next/src/components/navbar/home.tsx:85`                                                           | `{ href: "/hire", label: "Hire" }` nav entry, dangles once `/hire` is gone.               | EDIT (drop the line)                |
| `web/next/src/lib/fonts.ts` (`caveat`, `newsreader`) + `web/next/src/fonts/{caveat,newsreader}*.woff2` | Fonts used only by the resume page.                                                       | REMOVE (after the route is gone)    |
| `.infisical.json`                                                                                      | Routes `infisical run` to the AUTHOR's secret-manager project. Tracked, ships to forks.   | REMOVE (security/correctness)       |
| `.github/reviews/`                                                                                     | Author dev-meta (e.g. `2025-12-26-cursor-composer-1.md`). Same class as `.github/audit/`. | REMOVE                              |
| `.github/assets/graph-build.svg`                                                                       | Build-size graph with a `zerostarter` label; CI regenerates it on first build.            | REMOVE (stale)                      |
| `web/next/src/app/favicon.ico`                                                                         | zerostarter-branded favicon.                                                              | REMOVE/replace (cosmetic, optional) |

### B. Config that misconfigures or misattributes the fork (small targeted edits)

These are not cosmetic: left as-is they point the fork's tooling/legal at zerostarter.

| Path                                   | Line     | Content                                               | Action                                  |
| -------------------------------------- | -------- | ----------------------------------------------------- | --------------------------------------- |
| `LICENSE.md`                           | 3        | `Copyright (c) 2025 Neeraj Dalal`                     | EDIT to the fork owner + year           |
| `.github/rulesets/main.json`           | 5        | `"source": "nrjdalal/zerostarter"`                    | EDIT to `${owner}/${repo}`              |
| `.github/rulesets/canary.json`         | 5        | `"source": "nrjdalal/zerostarter"`                    | EDIT to `${owner}/${repo}`              |
| `.github/scripts/changelog-manager.ts` | 101-102  | default fallbacks `"nrjdalal"` / `"zerostarter"`      | EDIT defaults to `${owner}` / `${repo}` |
| `.github/scripts/build-sizes.ts`       | 104, 113 | `"zerostarter"` graph root label                      | EDIT to `${repo}` (cosmetic)            |
| `docker-compose.yml`                   | 1        | `name: zerostarter` (compose project / volume prefix) | EDIT to `${repo}`                       |
| `.github/FUNDING.yml`                  | 1        | `github: nrjdalal`                                    | EDIT to `${owner}`, or delete the file  |

### C. Cosmetic brand text, leave for the fork to own (matches the README stance)

These render product copy or comments the fork rewrites when it is ready; not load-bearing.

| Path                                         | Notes                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` (29 hits)                        | `zerostarter.dev` links, `@nrjdalal`, Discord, the `gitpick` install URL. The fork's README to write.                                                               |
| `web/next/src/app/page.tsx` (13 hits)        | Marketing landing. Hardcodes `"ZeroStarter"` (not `site.name`) at ~6 spots, a `@nrjdalal` footer, and `cd zerostarter` in a snippet. The fork replaces the landing. |
| `web/next/src/components/mode-toggle.tsx:12` | `/* The smart toggle by @nrjdalal */` attribution comment.                                                                                                          |
| `AGENTS.md:16`                               | Agent-login example mentioning `AgentZero` / `agent@zerostarter.dev`.                                                                                               |
| `.env.example` (29, 33)                      | Two comment links to `zerostarter.dev/docs/...`.                                                                                                                    |

Note: `page.tsx` hardcodes `"ZeroStarter"` instead of reading `site.name`. If the landing were made to read `site.name`, the `init` rebrand of `site.ts` would carry the home page for free. Worth doing in the starter itself regardless of the CLI.

## Recommended plan

Tiered by how well it fits the "stay simple" CLI:

1. **Fold into `init` now (pure removals, zero new machinery):** add to the removal list `web/next/src/app/hire`, `web/next/src/app/resume`, `.infisical.json`, `.github/reviews`, `.github/assets/graph-build.svg`; plus the one coupled edit to drop the `/hire` navbar entry, and prune the resume-only fonts. `.infisical.json` is the most important (it ships the author's secret-manager routing).
2. **Optional targeted config edits (correctness, ~6 known files):** `LICENSE.md`, the two rulesets, `changelog-manager.ts` defaults, `docker-compose.yml` name, `FUNDING.yml`. Small per-file string replaces using `${owner}`/`${repo}`/name that `init` already has. This is the one place that reintroduces a little edit logic; it is the simplicity-vs-correctness line to decide.
3. **Leave to the fork:** README, `page.tsx` marketing, the mode-toggle comment, AGENTS.md, `.env.example` doc links. Optionally list them in `init`'s next-steps so the fork knows.

Separate, starter-side improvement (not CLI): make `page.tsx` read `site.name` instead of hardcoding `"ZeroStarter"`, so the home page rebrands with `site.ts`.
