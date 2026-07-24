---
name: skills-sync
description: Regenerate the AGENTS.md skills tables from skill descriptions, and re-sync a vendored skill from its upstream tool. Use after editing a skill's frontmatter, when adding or removing a skill, or when the AGENTS.md skills-table check fails.
source: local
files:
  - .github/scripts/skills.ts
---

# Skill Sync

Every skill carries its **provenance** in frontmatter, and `.github/scripts/skills.ts` is the maintainer that reads it:

- `source: local` is authored here, this repo is the origin (no upstream to check).
- `source: <tool>` is vendored: re-synced by re-running the tool, never hand-edited (see the `vendor` skill).
- `source: owner/repo` marks a skill inherited from another repo, checked against it by `--outdated` (forks use this; the scaffold itself does not).
- `files:` are the dependent files that travel with the skill, reconciled alongside it.

## Regenerate the AGENTS.md tables

The skills tables in `AGENTS.md` are generated from each skill's `description`, never hand-kept, so the description is the single source:

```bash
bun .github/scripts/skills.ts          # rewrite the tables from the skills
bun .github/scripts/skills.ts --check  # fail on drift instead of writing (the gate)
```

Each cell is the description's summary, the sentence before `Use ...`, so keep every description in the `<summary>. Use when <triggers>` shape and edit the description, not the table. Done when `--check` passes.

## Re-sync a vendored skill

```bash
bun .github/scripts/skills.ts --outdated
```

reports each skill as `local, no upstream`, `vendored (<tool>)`, or, for an inherited skill, `up to date` / `DIFFERS from upstream`. A `vendored` skill is not hand-edited: re-run the tool's own export (e.g. `agent-browser skills get core`) or re-vendor it. Done when `--outdated` shows only intended divergence.

## Notes

- Adding or removing a skill changes the tables: run the generator so `AGENTS.md` matches, or the `--check` gate fails.
- `name`, `description`, and `source` are the contract the maintainer reads; a missing one makes `skills.ts` throw rather than emit a half-built table.
