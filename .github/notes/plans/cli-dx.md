# CLI developer experience: what the 2026-07-04 audit left open

- Status: backlog
- Links: the CLI DX audit of 2026-07-04 (deleted once folded in here; ten findings, ranked), PR #645 (findings 1 and 6)

The audit covered `packages/cli` (`init`, `reinit`, `sync`) for two readers: someone running the CLI, and someone maintaining it. Three findings are closed: subprocess failures now print their real output (1), a mistyped flag prints that command's help (6), and the npm page has a README, since npm packs `README.md` whatever `files` says (8). What is left, in the audit's own order of payoff:

- **`--dry-run` on `reinit` and `sync`** (finding 2, high). Only `init` previews its plan. `reinit` deletes every tracked file and `sync` overwrites starter files in place, and neither can show what it would delete, keep or overwrite first. `reinit` should list kept (`.git`, `.env*`) against deleted; `sync` should list its preserve set and the merge plan without touching the tree.
- **`--ref` and a provenance stamp** (finding 3, high, structural). All three commands fetch `main`, so a scaffold cannot be pinned or reproduced, and a fork records nothing about the starter commit it came from. Accept `--ref <branch|tag|sha>` on all three, threaded through the fetch and overlay helpers, and write a stamp on `init` and `sync` (ref, resolved sha, CLI version, date). That is what would let `sync` say how far behind a fork is.
- **`sync` confirms nothing and takes no `--yes`** (finding 4, medium). `reinit` confirms and honours `-y`; `sync` just runs, though it overwrites tracked files and runs an install. Rollback makes it safer, but the asymmetry surprises, and its `--help` does not explain the `[dir]` positional. Add the confirm and the flag, or record that skipping it is deliberate.
- **No update notice** (finding 5, medium). An old cached `npx zerostarter` runs silently. A best-effort comparison of the running version with the npm `latest` dist-tag, short timeout and never blocking, would print one line on a mismatch.
- **Command flows are only partly tested** (finding 7, medium). `init` and the prompt layer now have tests under `tests/packages/cli/bin/commands/`; `reinit` and `sync` have none. Extract their pure branching into units and cover those; network, git and docker stay out of scope.
- **No `--verbose`** (finding 9, low). Nothing surfaces the raw spawned command and its full output when a step misbehaves. Complements the error-legibility work.
- **`gitpick@6.0.0` is a literal at two call sites** (finding 10, low). `pglaunch` is already one constant in `src/db.ts`; `src/git.ts` still repeats the gitpick pin, so a bump touches two places. Pinning is the right policy; hoist it to one constant.

The audit's suggested order still holds: dry-run parity first, since it is the trust gap on the two destructive commands, then the ref and the stamp, then the polish.
