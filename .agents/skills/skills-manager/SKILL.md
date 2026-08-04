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

Provenance is never rewritten by a sync: a `local` or vendored skill in a fork stays that way, because a wrong `source` is a silent, self-propagating loss of where a skill actually came from.

## Regenerate the tables

The hook handles this on commit, but to run it by hand:

```bash
bun .github/scripts/skills-manager.ts          # rewrite the tables from the skills
bun .github/scripts/skills-manager.ts --check  # fail on drift instead of writing (the gate)
```

Each cell is the description's summary, the sentence before `Use ...`, so keep every description in the `<summary>. Use when <triggers>` shape and edit the description, not the table. Done when `--check` passes.

## How a fork syncs

A fork inherits its skills from the scaffold. On `init` and `sync` the CLI rebrands each skill's prose to the fork's project name (read from `package.json`). A skill this repo authored (`source: local`) becomes `source: <upstream repo>` with a `[!CAUTION]` note at the top; a skill this repo vendored keeps its tool as `source` and takes no note, so the fork re-vendors it the same way and it stays in that fork's **Vendored** table.

Provenance decides what a later `sync` may touch: it rewrites only the skills sourced from here, and leaves every other one exactly as the fork has it.

That note is the contract: `bunx zerostarter` updates a skill only while the note is intact and the body still matches what the CLI last wrote. Customize the skill or drop the note and the fork owns it, and sync names it in the summary instead of replacing it.

Prose cannot be compared directly (sync rebrands the body to the fork's name, so a synced skill never matches upstream byte for byte), so the CLI records what it wrote in `.agents/skills/.sync.json`: per skill, the ref it came from plus a hash of the upstream file and of the file as written. That ledger is what separates "the fork edited this" from "upstream moved". The ref is recorded because the CLI syncs a fork from `main` while this repo's default branch is `canary`, so comparing against the wrong one would report every skill canary is ahead on as drifted. A fork commits the ledger like any other synced file; this repo has none, since every skill here is `source: local`.

Check state from inside a fork with:

```bash
bun .github/scripts/skills-manager.ts --outdated
```

which reports each skill as `local, no upstream`, `vendored (<tool>)`, `untracked` (customized there, or synced before the ledger existed), or, for a tracked skill, `up to date` / `DIFFERS from upstream`, plus `edited here` when the fork has since changed it.

## Notes

- Adding or removing a skill changes the tables; the hook regenerates them, and `--check` is the gate if it is ever bypassed.
- `name`, `description`, and `source` are the contract the manager reads; a missing one makes it throw rather than emit a half-built table.
