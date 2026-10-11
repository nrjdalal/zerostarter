---
name: skills-manager
description: Keep the AGENTS.md skills tables generated from skill descriptions. Use after editing a skill's frontmatter, when adding or removing a skill, when the skills-table check fails, or when asked whether a fork's skills are up to date.
source: local
---

# Skills Manager

The prose of a skill itself follows `writing-for-agents`; this skill covers the catalog and provenance. `.github/scripts/skills-manager.ts` generates the AGENTS.md skills tables from each skill's `name`, `description`, and `source`; a missing one makes it throw rather than emit a half-built table.

`source` is a skill's provenance, and decides its table:

- `local`: authored here, under **Custom**.
- A bare tool name (`agent-browser`, `portless`, `skills`): vendored, named after the upstream repo, under **Vendored**. Re-vendoring rewrites the folder, so the `source:` line goes back in afterward.
- A GitHub URL or `owner/repo`: synced from that upstream, which the CLI stamps on a fork.

A sync never rewrites provenance: a fork's `local` or vendored skill stays so.

## Regenerate

The pre-commit hook runs the manager whenever a skill or the manager itself is staged. By hand:

```bash
bun .github/scripts/skills-manager.ts          # rewrite the tables
bun .github/scripts/skills-manager.ts --check  # fail on drift instead of writing
```

Each cell is the sentence before `Use ...`, so keep that `<summary>. Use when <triggers>` shape and edit the description; the hook rewrites the table. Quote a description holding `: `, or the manager throws. Done when `--check` passes.

## How a fork syncs

- A sync rewrites only the skills sourced from the starter; the `> Synced from <upstream>.` line inside the stamped `[!CAUTION]` note is the opt-in, and removing that line hands the skill to the fork.
- A skill the fork edited keeps the fork's version, and the sync summary names it.
- `.agents/skills/.sync.json` records what the CLI wrote (`ref`, `upstream`, `written` per skill, and `AGENTS.md` under its own path); a fork commits it after its first sync, and the canonical starter has none.
- A custom skill is one file, since the CLI syncs only `SKILL.md`.
- `packages/cli/src/skills.ts` holds the rules and `getting-started/cli.mdx` the human narrative, both in the canonical starter only.

## Check state

```bash
bun .github/scripts/skills-manager.ts --outdated
```

Reports each skill as `local, no upstream`, `vendored (<tool>)`, `untracked` (customized, or synced before the ledger), `not in <source>`, `upstream fetch failed (HTTP <n>)`, or `up to date` / `DIFFERS from upstream`, plus `edited here` when the fork changed it since. Done when every skill reports as expected.
