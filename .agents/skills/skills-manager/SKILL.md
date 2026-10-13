---
name: skills-manager
description: Keep the AGENTS.md skills tables generated from skill descriptions. Use after editing a skill's frontmatter, when adding or removing a skill, when the skills-table check fails, or when asked whether a fork's skills are up to date.
source: local
---

# Skills Manager

The prose of a skill itself follows `writing-for-agents`; this skill covers the catalog and provenance. `.github/scripts/skills-manager.ts` generates the AGENTS.md skills tables from each skill's `name`, `description`, and `source`; a missing one makes it throw rather than emit a half-built table.

`source` is a skill's provenance, and decides its table:

- `local`: authored here, under **Custom**.
- A bare tool name (`agent-browser`, `portless`, `skills`): vendored from upstream, under **Vendored**; [Re-vendor](#re-vendor) updates one.
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
- A skill the fork edited keeps the fork's version, and the sync summary names it. Two cases take the update instead: a starter-sourced skill with no ledger entry (a fork last synced by a CLI older than the ledger), and what `init` records when it is run again in the fork. That `init` rebuilds the ledger from the files as they stand and stamps every `source: local` skill as the starter's, a fork's own included, so the next sync reads earlier edits to the starter-sourced skills and to `AGENTS.md` as the CLI's own and replaces each one the starter ships, without naming it. A vendored skill, or one from another upstream, keeps its source, so it stays the fork's.
- `.agents/skills/.sync.json` records what the CLI wrote (`ref`, `upstream`, `written` per skill, and `AGENTS.md` under its own path); a fork carries it from `init` and commits it with every sync, and the canonical starter has none.
- A custom skill is one file, since the CLI rebrands, records and protects only `SKILL.md`: a file beside it reaches a fork through the sync overlay unrebranded and is overwritten by every sync, a vendored skill's siblings included, even when the fork keeps its own `SKILL.md`.
- `packages/cli/src/skills.ts` holds the rules and `getting-started/cli.mdx` the human narrative, both in the canonical starter only.

## Check state

```bash
bun .github/scripts/skills-manager.ts --outdated
```

Reports each skill as `local, no upstream`, `vendored (<tool>)`, `untracked` (no ledger entry: one the fork took from another repo, or one no ledger-keeping sync has written yet; the label's "customized here" is wrong, since sync keeps an edited skill's entry and reports it `edited here`), `not in <source>`, `upstream fetch failed (HTTP <n>)`, or `up to date` / `DIFFERS from upstream`, plus `edited here` when the fork changed it since. Done when every skill reports as expected.

## Re-vendor

Re-vendoring rewrites the folder: `bunx skills@1.7.2 update -p -y` for the skills `skills-lock.json` records (`-p` keeps it to project skills, `-y` skips the scope prompt the bare command opens), a fresh copy from upstream for `portless`. Then put back what this repo adds:

- the `source:` line on each vendored skill;
- the `## Viewport` section on `agent-browser`;
- a sweep of the em-dashes upstream writes, which `AGENTS.md` forbids.

Done when each vendored skill carries its `source:` line, `agent-browser` has its `## Viewport` section, `rg -n '\x{2014}' .agents/skills` prints nothing, and `--check` passes.
