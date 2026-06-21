# Scaffold dangling-references audit (2026-06-21)

Thorough sweep of a freshly converted scaffold for anything still dangling, stale,
or extra after the CLI's removals, run after the post-reconciliation CLI
(`fixConfig` dropped, version loop dropped, FUNDING removed).

## Method

`init` a fresh scaffold from the current tree, then sweep for: dangling symlinks,
tracked lock/manifest files pointing at removed content, kept files referencing
removed paths, leftover brand markers, and unexpected root/`.github` entries.

## Findings

| Item                         | Verdict                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills-lock.json` (root)    | **FIX → remove.** Tracked skills lockfile pinning `agent-browser` (`skills/agent-browser/SKILL.md` + hash); the skills dirs are removed, so it dangles. Added to the CLI removals.                                  |
| `.github/skills` symlink     | Already fixed in `8cd924a` (was dangling; the skills target is removed).                                                                                                                                            |
| dangling symlinks            | None. Only `CLAUDE.md -> AGENTS.md` remains and resolves (the CLI writes `AGENTS.md`).                                                                                                                              |
| `AUDIT.md` (root)            | **Keep.** Canonical dependency-override record (`esbuild` advisory via drizzle-kit/fumadocs-mdx applies to forks too); the file itself says "do not delete it".                                                     |
| `.fallow` (dir), `.vercel`   | Untracked / gitignored — never committed, so never ship to a fork (only present as local rsync artifacts in testing).                                                                                               |
| empty `.agents/`, `.claude/` | Git does not track empty dirs, so they never appear in the pushed scaffold. No action.                                                                                                                              |
| stale scripts / workflows    | None. `package.json`'s only match is the kept `console:roles`; no workflow references skills.                                                                                                                       |
| brand markers                | Only the known, intentional residuals: `README.md` (the fork's to own), two `.env.example` doc-link comments, and the kept `mode-toggle.tsx` `@nrjdalal` comment (a generic author note, not zerostarter branding). |

## Verdict

After removing `skills-lock.json`, a converted scaffold has no dangling references
and no stale tracked files. The only remaining zerostarter mentions are the three
intentional residuals above. The CLI's removal set is now: the content/public/skills
dirs (+ `.claude/skills`, `.github/skills`), `packages/cli`, `.github/{audit,reviews,assets/graph-build.svg,FUNDING.yml}`,
`.infisical.json`, `LICENSE.md`, `CHANGELOG.md`, `bun.lock`, `skills-lock.json`, the
hire/resume routes, and the resume-only fonts.
