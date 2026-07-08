---
name: doc-sync
description: Sync docs and skills so they never drift from the code. Use before opening or updating a PR, or when a change touches a command, path, convention, or the skill set a doc or skill documents.
---

# Doc Sync

A change ships with its docs or it ships drift. This is the procedure to catch drift across every hand-authored surface before the PR goes up. `AGENTS.md` makes the sync mandatory; this makes it checkable.

## Surfaces

Hand-authored, keep these in step with the code:

| Surface | Documents | Drifts when |
| --- | --- | --- |
| `web/next/content/docs/**.mdx` | concepts and how-to (getting-started, deployment, manage, resources) | a feature, convention, API, command, script, or env var it describes changes |
| `web/next/docs.config.ts` | the docs nav and page registry, the single source the sidebar, `meta.json`, and MDX frontmatter all derive from | a doc page is added, removed, renamed, or re-slugged |
| `README.md` | top-level story: stack, structure, quick start, scripts, deployment | the stack, setup, scripts, or pitch changes |
| `.agents/skills/<name>/SKILL.md` | one task procedure each (canonical; `.claude` and `.github` symlink in) | a command, path, convention, or tooling a skill encodes changes, or a skill is added or removed |
| `AGENTS.md` (`CLAUDE.md` symlinks in) | the rules and the skills catalog table | a rule changes, or the skill set changes |

Generated, never hand-edit (they regenerate from the surfaces above): `content/docs/meta.json` (git-ignored), the `/llms.txt` and `/llms-full.txt` routes, and the fumadocs search index.

## Procedure

### 1. Scope the change

List what the diff touched: paths, commands, script names, env vars, conventions, tooling, and whether the skill set changed. Start from `git diff --stat` and the code diff.

### 2. Hunt drift

Grep every surface for each changed path, command, or symbol. Every hit is a candidate:

```bash
rg -n "<changed-path-or-command>" web/next/content/docs README.md AGENTS.md .agents/skills web/next/docs.config.ts
```

### 3. Sync, coupled surfaces included

Update each hit in the same change. Two couplings are easy to miss:

- **Add or remove a skill** touches three places: the `AGENTS.md` skills table, the `resources/ai-skills.mdx` catalog row, and that file's "N skills" counts.
- **Add, remove, or rename a doc page** touches `web/next/docs.config.ts`, not the `.mdx` alone.

### 4. Verify with the repo's own drift gate

```bash
bun .github/scripts/docs.ts --strict
```

This is the fast gate (seconds): it exits non-zero on any `.mdx` missing from `docs.config.ts`, any config entry with no file, or frontmatter drifted from `docs.config.ts`. To fix a failure, run it without `--strict` to rewrite the managed frontmatter and scaffold missing pages, then commit. Before the PR, also run `cd web/next && bun run build` once: it reruns this check inside the full build and additionally catches type errors and rebuilds the search index. Done when the strict gate passes AND a fresh `rg` for every removed or renamed path, command, and skill name finds zero stale mentions across the surfaces.

## Notes

- Skills are symlinked: `.agents/skills` is canonical, edit once.
- The `/llms.txt` and `/llms-full.txt` routes mirror the docs and regenerate at build, so fix the doc, never the route.
