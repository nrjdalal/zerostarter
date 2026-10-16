# Skills with more than one file do not sync to forks

- Status: icebox
- Links: PR #872 (the wiring cluster of the skills rewrite), `packages/cli/src/skills.ts`

## The concern

`packages/cli/src/skills.ts` reads, rebrands, hashes, restores and reports only `SKILL.md`: `skillDirs`, `snapshotSkills`, `renderForkSkill` and `keep` each name that one file. A skill that carries a sibling file (a branch disclosed behind a pointer, the way the vendored `writing-for-agents` carries `SKILL-MECHANICS.md`) reaches a fork through the gitpick overlay unrebranded, is overwritten by a later `sync` without being named in the summary, and never shows in `--outdated`.

## Context

`writing-for-agents` asks for exactly this shape: material only some branches reach goes behind a pointer, into a sibling file. The rewrites so far keep every custom skill in one file and carry a branch as a short section at the end, which keeps fork sync correct at the cost of a longer main file. The vendored skill shares half of it: sync restores a vendored `SKILL.md` from the fork's snapshot, but the overlay rewrites `writing-for-agents/SKILL-MECHANICS.md` with the starter's copy, so a fork that re-vendored at another version is left with a mismatched pair.

## Open question

Extend the CLI to walk every `*.md` in a skill directory (snapshot, rebrand, restore, hash, and the `.sync.json` ledger per file), with a test in `tests/packages/cli/src/skills.test.ts`, so custom skills may split; or keep custom skills single-file and record that as the convention in `skills-manager`.
