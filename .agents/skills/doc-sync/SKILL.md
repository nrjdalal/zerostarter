---
name: doc-sync
description: Sync docs and skills so they never drift from the code. Use before opening or updating a PR, or when a change touches a command, path, convention, or the skill set a doc or skill documents.
source: local
---

# Doc Sync

A change ships with its docs or it ships drift. This is the procedure that catches drift across every hand-authored surface before the PR goes up: `AGENTS.md` makes the sync a rule, this makes it checkable.

## Surfaces

Hand-authored, each kept in step with the code:

| Surface | Documents | Drifts when |
| --- | --- | --- |
| `web/next/content/docs/**.mdx` | concepts and how-to (getting-started, deployment, manage, resources) | a feature, convention, API, command, script, or env var it describes changes |
| `web/next/docs.config.ts` | the docs nav and page registry, the single source the sidebar, `meta.json`, and MDX frontmatter all derive from | a doc page is added, removed, renamed, or re-slugged |
| `README.md` | top-level story: stack, structure, quick start, scripts, deployment | the stack, setup, scripts, or pitch changes |
| `.agents/skills/<name>/SKILL.md` | one task procedure each (canonical; `.claude` and `.github` symlink in, so edit once) | a command, path, convention, or tooling a skill encodes changes, or a skill is added or removed |
| `AGENTS.md` (`CLAUDE.md` symlinks in) | the rules and the skills catalog table; ships to every fork whole, so a rule must read true there too | a rule changes, or the skill set changes |
| `packages/cli/README.md` (canonical starter only) | the CLI's npm page: its commands, requirements and what `sync` keeps | a CLI command, flag, prerequisite, or fork-boundary rule changes |
| `packages/config/src/site.ts` | the brand, the feature flags, and the hand-written preamble served at the top of `/llms-full.txt` | the layout, the route groups, the packages, or the API surface it describes changes |

Generated from the surfaces above, so fixed at the source rather than in the output: `content/docs/meta.json` (git-ignored), the `/llms.txt` and `/llms-full.txt` routes, and the fumadocs search index. The one hand-written part of those routes is the `/llms-full.txt` preamble, which lives in `site.ts` above.

## 1. Scope the change

List what the diff touched: paths, commands, script names, env vars, conventions, tooling, and whether the skill set changed, starting from `git diff --stat` and the code diff. A changed skill description counts, since the `AGENTS.md` table and the docs catalog entry quote it; so does a removed section or a rule shrunk to a pointer. Done when every path, command, symbol and skill-set change in the diff is on the list.

## 2. Hunt drift

Grep every surface for each item on the list, a removed section by its heading and a changed description by its old wording; every hit is a candidate:

```bash
rg -n "<changed-path-or-command>" web/next/content/docs README.md AGENTS.md .agents/skills web/next/docs.config.ts packages/cli/README.md packages/config/src/site.ts
```

Where a path is absent, as `packages/cli/README.md` is in a fork, `rg` reports it missing and exits 2 but still searches the rest. Done when every surface has been grepped for every item.

## 3. Sync, coupled surfaces included

Fix each hit in the same change: a page that needs more than a line follows `writing-docs`, and a skill follows `writing-for-agents`. A skill the change makes obsolete is removed, and a gap it reveals gets one. Three couplings are easy to miss:

- **Adding or removing a skill** touches the `AGENTS.md` skills table (generated, so run `bun .github/scripts/skills-manager.ts`) and, in the canonical starter, the `resources/ai-skills.mdx` catalog entry. A vendored one also touches that page's list of vendored skills, and `skills-lock.json` when the `skills` CLI installed it (`agent-browser`, `writing-for-agents`); one copied by hand (`portless`) has no lock entry.
- **Changing a skill's description** regenerates its `AGENTS.md` cell, and in the canonical starter the `resources/ai-skills.mdx` catalog quotes that cell word for word, so its entry changes with it.
- **Adding, removing, or renaming a doc page** touches `web/next/docs.config.ts`, not the `.mdx` alone.

A rule shrunk to a pointer is read at its target once, since a pointer at a skill that never states the rule is drift with a nicer name. Done when every hit is fixed or consciously kept, every pointer's target holds its rule, and the skill set matches the change.

## 4. Verify with the repo's own drift gate

```bash
bun .github/scripts/docs.ts --strict
```

This is the fast gate (seconds): it exits non-zero on any warning, which covers an `.mdx` missing from `docs.config.ts`, a config entry with no file, a duplicate or misplaced entry, frontmatter drifted from `docs.config.ts`, and a blog post with a missing or invalid `createdAt`, an invalid `updatedAt` or `publishedAt`, or neither `publishedAt` nor `draft: true`. The unflagged run fixes three of them, rewriting drifted frontmatter, scaffolding a page the config lists but no file holds, and backfilling a post's missing `createdAt`, and it exits 0 whatever is left, so run `--strict` again after it. The rest are hand fixes: an unlisted `.mdx` gets its `docs.config.ts` entry or is removed, a bad entry is fixed in `docs.config.ts`, and a post's invalid date or missing `publishedAt` (or `draft: true`) is fixed in its frontmatter. Commit what the run wrote. Before the PR, also run `bunx turbo run build --filter=@web/next` once, through turbo so the shared packages `next.config.ts` imports are built first: it reruns this check inside the full build, and additionally catches type errors and rebuilds the search index. Done when the strict gate passes AND a fresh `rg` for every removed or renamed path, command, and skill name finds zero stale mentions across the surfaces.
