---
name: audit
description: Refresh every dependency and version pin to its latest release, run the dependency security audit, and maintain .github/notes/dependencies.md. Use when updating dependencies or any version pin (Bun, a GitHub Action, a pinned CLI), when the canary pre-push audit hook fails, or when `bun audit` flags a high advisory.
source: local
---

# Dependency Refresh and Audit

Two jobs share one record. A **refresh** moves everything to its latest release; an **audit** clears a high advisory. The pre-push hook runs the audit, on `canary` only (`lefthook.yml`). `.github/notes/dependencies.md` is the canonical record of every active override, ignored advisory and held version, and it stays in place even when there are none.

## Refresh

A refresh moves the npm tree, then the pins outside it, which `bun update` never reaches.

### 1. Update the npm tree

```bash
bun update -r --latest
bun install        # once more: postinstall rewrote ranges, so bun.lock is one install behind
bun outdated -r    # expect no rows
```

`--latest` crosses majors and rewrites the catalog; `postinstall` rewrites exact and tilde specs back to carets and reports the rest for a manual fix. For each package that crossed a major, read its current release notes or migration guide and grep the code for what it removed or renamed. Transitive copies stay wherever their parents' ranges hold them: a fresh lockfile barely moves them and only an override could lift them, so leave them. In the canonical starter, read `## Held versions` in `.github/notes/dependencies.md` first: the update moves each held group past its hold, so put that group's catalog entries and `bun.lock` back to its held versions after it, unless step 4 proves the break fixed. Done when `bun outdated -r` prints no rows but the held groups'.

### 2. Move the pins outside npm

These name a version no `package.json` range covers:

| Pin | Where it lives | Latest release |
| --- | --- | --- |
| Bun | `packageManager` in the root `package.json`, `FROM oven/bun:<version>-alpine` in both Dockerfiles, `bun-version:` in every workflow job | `npm view bun version` |
| CLI-executed packages (canonical starter only) | `GITPICK` in `packages/cli/src/git.ts`, `PGLAUNCH` in `packages/cli/src/db.ts` | `npm view <name> version` |
| GitHub Actions | every `uses:` in `.github/workflows/` | `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name` |
| Node (canonical starter only) | `node-version:` in `.github/workflows/cli-release.yml` | the newest LTS line at https://nodejs.org/en/about/previous-releases |
| Vercel's Bun runtime | `bunVersion` in `api/hono/vercel.json` and `web/next/vercel.json` | the values https://vercel.com/docs/functions/runtimes/bun lists |

After each move, `git grep -nF '<old value>' -- ':!bun.lock' ':!CHANGELOG.md'` lists every copy left: the docs that quote it, and in the canonical starter the notes under `.github/notes/`. A hit that belongs to something else (a test fixture sharing the number) stays.

- **Bun:** `bun upgrade` first, so the local gates in step 4 run under the pinned release. `@types/bun` is a catalog entry, so step 1 moves it; it trails Bun's patch releases, so a lower patch there is expected.
- **CLI-executed packages:** prove each by running it. A new gitpick fetches the same tree: run the old and the new version into two empty directories and `diff -r` them, then again as an overlay (`-o`) onto an existing checkout. A new pglaunch provisions and migrates through `init --db` against a running Docker.
- **GitHub Actions:** a major tag is the pin, so only a new major moves it. Read that major's release notes against how each workflow uses the action: its inputs, privileged triggers such as `pull_request_target` and `workflow_run`, and any script that `require`s a module. A pull request runs its own copy of only its `pull_request` and `pull_request_review` workflows. `pull_request_target` runs the base branch's copy, a `push` workflow runs on the next `canary` push that matches its path filter, and a workflow on a pull request closed into `main` or on `workflow_run` runs at the next release. So each workflow whose action moved has its first real run after the PR, and that run is the one to watch.
- **Node:** the comment beside it names the npm floor it keeps, so it moves to a new LTS line, not to every release.
- **Vercel's Bun runtime:** `bunVersion` names a release line, not a release, and Vercel moves the patch itself, so a Bun patch release changes nothing here. Move it only when the docs list a new line and the code is checked against that line's breaking changes; `web/next/content/docs/deployment/vercel.mdx` (canonical starter only) quotes the line and the accepted values.

Done when every row is on its latest release and the old-value grep returns no hit that belongs to the pin.

### 3. Re-sync shadcn

Run `bun run sync:shadcn` (the `shadcn-sync` skill). The registry moves with the `shadcn` package, so a refresh is when components drift. Done when the diff is empty or holds only registry changes, and the type check passes.

### 4. Prove nothing broke

A refresh touches every surface, so verify every surface:

1. **Gates:** the audit command `lefthook.yml` runs, then `bun run format:check`, `bun run lint`, `bun run check-types`, `bun run test`, and `bun run build`, with `TURBO_FORCE=true` set so every turbo task executes, since a cache hit replays an old green.
2. **End to end (canonical starter only):** the golden suite against a local stack, twice (the `docker-test` skill).
3. **Docker:** when Bun or anything in the image moved, build both images with `--no-cache` and run the single-libc and offline checks (the `docker-test` skill).
4. **Browser:** drive the pages built on the packages that moved (the `ui-verify` skill), for example the docs search after Fumadocs moves, or the console tables and their menus after Base UI moves.

When something breaks, bisect: pin one package group back to the base branch's versions, keep every other update, and retest. Packages that release together, such as `fumadocs-core`, `fumadocs-ui`, and `fumadocs-mdx`, move back together. Fix the code where the fix is ours; a group that has to stay back keeps its older versions, with the reason in the PR body and, in the canonical starter, an entry under `## Held versions` in `.github/notes/dependencies.md`, and its packages are the only rows `bun outdated -r` is then expected to print. Done when every gate is green, the suite passes twice, and the browser pass is clean.

### 5. Ship

One PR titled `build(deps): ...`, so the window can release (the `gh-commit` skill). Its body lists each pin from step 2 with its old and new version, and any breakage with its fix. Done when its CI is green and, after the merge, the `canary` push's workflows pass; a workflow that first runs at the next release is checked then.

## Audit

### 1. Run

```bash
bun audit --audit-level high
```

Add the `--ignore` flags the command in `lefthook.yml` carries, so an accepted exception stays quiet. Done when the output is clean, or you have the list of high advisories to clear.

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
