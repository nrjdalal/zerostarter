---
name: audit
description: Refresh every dependency and version pin to its latest release, run the dependency security audit, and maintain .github/notes/dependencies.md. Use when updating dependencies (`bun update`), when moving Bun, a GitHub Action, or a pinned CLI to a new release, when the canary pre-push audit hook fails, or when `bun audit` flags a high advisory.
source: local
---

# Dependencies

Two jobs share one record. A **refresh** moves everything to its latest release; an **audit** clears a high advisory. The pre-push hook runs the audit, on `canary` only (`lefthook.yml`). `.github/notes/dependencies.md` is the canonical record of every active override and ignored advisory, and it stays in place even when there are none.

## Refresh

A refresh moves three kinds of pin, and `bun update` reaches only the npm ones.

### 1. Update the npm tree

```bash
bun update -r --latest
bun install        # once more: a range postinstall rewrote leaves bun.lock one install behind
bun outdated -r    # expect no rows
```

`--latest` crosses majors and rewrites the catalog; `postinstall` puts every entry back on a caret. For each package that crossed a major, read its current release notes or migration guide, not memory, and grep the code for what it removed or renamed. Transitive copies stay wherever their parents' ranges hold them: a fresh lockfile barely moves them and only an override could lift them, so leave them. Done when `bun outdated -r` prints no rows.

### 2. Move the pins outside npm

These name a version no `package.json` range covers, so `bun update` never sees them:

| Pin | Where it lives | Latest release |
| --- | --- | --- |
| Bun | `packageManager` in the root `package.json`, `FROM oven/bun:<version>-alpine` in both Dockerfiles, `bun-version:` in every workflow job | `npm view bun version` |
| CLI-executed packages (canonical starter only) | `GITPICK` in `packages/cli/src/git.ts`, `PGLAUNCH` in `packages/cli/src/db.ts` | `npm view <name> version` |
| GitHub Actions | every `uses:` in `.github/workflows/` | `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name` |
| Vercel's Bun runtime | `bunVersion` in `api/hono/vercel.json` and `web/next/vercel.json` | Vercel's Bun runtime docs |

- **Bun:** once it is moved, `git grep -nF '<old version>' -- ':!bun.lock' ':!CHANGELOG.md'` finds every copy left, the docs that quote it included. `@types/bun` is a catalog entry, so step 1 moves it; it trails Bun's patch releases, so a lower patch there is expected.
- **CLI-executed packages:** prove a new gitpick fetches the same tree. Run the old and the new version into two empty directories and `diff -r` them, then again as an overlay (`-o`) onto an existing checkout.
- **GitHub Actions:** a major tag is the pin, so only a new major moves it. Read that major's release notes against how each workflow uses the action: its inputs, privileged triggers such as `pull_request_target` and `workflow_run`, and any script that `require`s a module. A pull request tests only its `pull_request` workflows on its own copy: `pull_request_target` runs the base branch's copy, and the push, release, and publish workflows run after the merge. So an action moved in any of those first runs on the next `canary` push or pull request, and that run is the one to watch.
- **Vercel's Bun runtime:** `bunVersion` names a release line, not a release. Vercel accepts only the values its docs list (`1.4.x` and `1.x` today) and moves the patch itself, so a Bun patch release changes nothing here. Move it only when the docs list a new line and the code is checked against that line's breaking changes.

Done when every row is on its latest release and the old-version grep returns nothing.

### 3. Re-sync shadcn

Run `bun run shadcn:update` (the `shadcn-sync` skill). The registry moves with the `shadcn` package, so a refresh is when components drift. Done when the diff is empty or holds only registry changes, and the type check passes.

### 4. Prove nothing broke

A refresh touches every surface, so verify every surface:

1. **Gates:** the audit command `lefthook.yml` runs, then `bun run format:check`, `bun run lint`, `bun run check-types`, `bun run test`, and `bun run build`, with `TURBO_FORCE=true` set so every turbo task executes, since a cache hit replays an old green.
2. **End to end:** the golden suite against a local stack, twice (the `docker-test` skill).
3. **Docker:** when Bun or anything in the image moved, build both images with `--no-cache` and run the single-libc and offline checks (the `docker-test` skill).
4. **Browser:** drive the pages built on the packages that moved (the `ui-verify` skill), for example the docs search after Fumadocs moves, or the console tables and their menus after Base UI moves.

When something breaks, bisect: pin one package group back to the base branch's versions, keep every other update, and retest. Packages that release together, such as `fumadocs-core`, `fumadocs-ui`, and `fumadocs-mdx`, move back together. Done when every gate is green, the suite passes twice, and the browser pass is clean.

### 5. Ship

One PR titled `build(deps): ...`, so the window can release (the `gh-commit` skill). Its body lists each pin from step 2 with its old and new version, and any breakage with its fix. Done when its CI is green, and after the merge, when the `canary` push's workflows pass.

## Audit

### 1. Run

```bash
bun audit --audit-level high
```

Done when the output is clean, or you have the list of high advisories to clear.

### 2. Fix on the highest rung that works

Fix each advisory on the highest rung that lifts the whole tree; drop a rung only when the one above cannot:

1. **Update the vulnerable dependency** (best): bump its `catalog:` entry in the root `package.json`.
2. **Update the parent** that pins the vulnerable transitive dependency.
3. **Override** (last resort): pin the patched version in root `overrides`:

   ```json
   "overrides": { "<vulnerable-package>": "<patched-version>" }
   ```

When the advisory lists no patched version at all, none of the three can lift it. Then the gate ignores that one advisory by ID: add `--ignore <GHSA-id>`, with a one-line comment naming the package and why (the notes below do not ship to a fork), to the audit command in both `lefthook.yml` and `.github/workflows/auto-check-build.yml`, mirror it in the docs that quote them (`manage/code-quality.mdx`, `contributing.mdx`), and record it under `## Ignored advisories` in `.github/notes/dependencies.md`. It is a security exception that ships to every fork, so it needs the user's go.

`bun audit fix` applies the first two rungs mechanically when a patched version exists within the ranges parents allow; `--dry-run` previews and `--latest` also crosses majors, so review what it picks before accepting. Read the advisory's affected ranges before reaching for a lower rung: the audit header lists every installed version of the package, not only the vulnerable ones. Follow with `bun dedupe` to collapse duplicate versions the tree accumulated.

Then `bun i` and prove nothing broke. Done when `bun run check-types && bun run build` pass and `bun audit --audit-level high` reports no high advisories.

### 3. Record every override and ignore

Every ignored advisory needs a block under `## Ignored advisories` with the same four fields, and leaves all four places together. Every entry in root `overrides` needs a matching block in `.github/notes/dependencies.md`, in the file's existing shape: one `### <package> → <version>` under `## Active overrides`, carrying **Advisory** (link, severity, affected range), **Why an override** (why an update or parent bump can't lift the tree), **Risk**, and **Exit criteria** (when to remove it). Delete a block when its override goes. Done when every override has a block and no block outlives its override.

### 4. Ship

`package.json`, `bun.lock`, and `.github/notes/dependencies.md` go through a normal PR.
