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
- `source: https://github.com/<owner>/<repo>` marks a skill a fork syncs from upstream (the CLI stamps this, with a `[!CAUTION]` sync note, when it scaffolds a fork). A synced skill also carries two drift stamps: `source-hash` (the upstream body it was last synced from) and `synced-hash` (the body as written by that sync). Both are 16 hex chars of sha256 over the LF-normalized, trimmed body, always double-quoted (an all-digit hash would otherwise parse as a YAML number and vanish); the implementations in `packages/cli/src/skills.ts` and `.github/scripts/skills-manager.ts` must stay identical.

## Regenerate the tables

The hook handles this on commit, but to run it by hand:

```bash
bun .github/scripts/skills-manager.ts          # rewrite the tables from the skills
bun .github/scripts/skills-manager.ts --check  # fail on drift instead of writing (the gate)
```

Each cell is the description's summary, the sentence before `Use ...`, so keep every description in the `<summary>. Use when <triggers>` shape and edit the description, not the table. Done when `--check` passes.

## How a fork syncs

A fork inherits its skills from the scaffold. On `init` the CLI rebrands each skill's prose to the fork's project name (read from `package.json`) and marks it with `source: <upstream repo>`, a `[!CAUTION]` note at the top, and the two drift stamps. That is the contract, and `sync` enforces it per skill from a pre-overlay snapshot: it takes the fresh upstream body only when `source` is the upstream repo, the note is intact, and the body still hashes to `synced-hash` (nothing was customized since the last sync). A non-upstream `source` (local, a tool, another repo), a removed note, or a customized body leaves the fork's file exactly as it was. The one exception is a note-intact skill with no stamp (synced before stamps existed): it is overwritten once to gain its stamps, and named in the sync summary so a lost customization is recoverable from the diff. Check state with:

```bash
bun .github/scripts/skills-manager.ts --outdated
```

which reports each skill as `local, no upstream`, `vendored (<tool>)`, or, for a synced skill, `up to date` / `OUTDATED (upstream changed since the last sync)`, comparing `source-hash` against a fresh upstream fetch (the sync transform guarantees raw bodies never match in a fork), and `unverifiable` when the stamp is missing.

## Notes

- Adding or removing a skill changes the tables; the hook regenerates them, and `--check` is the gate if it is ever bypassed.
- `name`, `description`, and `source` are the contract the manager reads; a missing one makes it throw rather than emit a half-built table.
