---
name: skills-manager
description: Keep the AGENTS.md skills tables generated from skill descriptions, and understand how a fork syncs its skills from upstream. Use after editing a skill's frontmatter, when adding or removing a skill, or when the AGENTS.md skills-table check fails.
source: local
files:
  - .github/scripts/skills-manager.ts
---

# Skills Manager

The AGENTS.md skills tables duplicate each skill's own `description`, so they are generated, never hand-kept. `.github/scripts/skills-manager.ts` is the maintainer, and a `pre-commit` hook runs it automatically whenever a skill (or the manager) changes, so the catalog never drifts.

Each skill carries its **provenance** in frontmatter:

- `source: local` is authored here (this repo is the origin).
- `source: <tool>` is vendored: re-synced by re-running the tool, never hand-edited.
- `source: https://github.com/<owner>/<repo>` marks a skill a fork syncs from upstream (the CLI stamps this, with a `[!CAUTION]` sync note, when it scaffolds a fork).

## Regenerate the tables

The hook handles this on commit, but to run it by hand:

```bash
bun .github/scripts/skills-manager.ts          # rewrite the tables from the skills
bun .github/scripts/skills-manager.ts --check  # fail on drift instead of writing (the gate)
```

Each cell is the description's summary, the sentence before `Use ...`, so keep every description in the `<summary>. Use when <triggers>` shape and edit the description, not the table. Done when `--check` passes.

## How a fork syncs

A fork inherits its skills from the scaffold. On `init` and `sync` the CLI rebrands each skill's prose to the fork's project name (read from `package.json`) and marks it with `source: <upstream repo>` plus a `[!CAUTION]` note at the top. That note is the contract: `bunx zerostarter` updates a skill only while the note is intact and the body still matches upstream. Customize the skill or drop the note and the fork owns it. Check state with:

```bash
bun .github/scripts/skills-manager.ts --outdated
```

which reports each skill as `local, no upstream`, `vendored (<tool>)`, or, for a synced skill, `up to date` / `DIFFERS from upstream`.

## Notes

- Adding or removing a skill changes the tables; the hook regenerates them, and `--check` is the gate if it is ever bypassed.
- `name`, `description`, and `source` are the contract the manager reads; a missing one makes it throw rather than emit a half-built table.
