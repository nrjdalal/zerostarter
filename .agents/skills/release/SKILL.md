---
name: release
description: Cut a production release by promoting canary to main. Use when asked to cut, ship, or publish a release, tag a version, or push canary to production.
source: local
---

# Release

Releases ship by promoting `canary` to `main`. Everything downstream (version bump, changelog, tag, GitHub release) is automated by `.github/workflows/auto-release.yml`; cutting a release is one deliberate merge, because `main` deploys to production.

## How it works

- Work reaches `canary` through squash-merged PRs (`canary` is the default branch).
- Every push to `canary` runs `auto-canary-into-main.yml`, which opens (or reuses) a **draft** PR `canary -> main` titled `ci(release): 🚀 merge canary into main`, and then moves the root `package.json` version forward to what the window has earned so far (`bun run release:version --write`: changelogen's bump applied to the last tag's version, kept if the tree is already ahead), committing `ci(version): bump to vX.Y.Z` when it moves. It skips when `main` is missing or `canary` is not ahead of it.
- Merging that PR into `main` with a **merge commit** fires `auto-release.yml` (trigger: a PR into `main` whose head branch is `canary`, merged). It then, working on `canary`:
  - takes the version from the tree (`bun run release:version` prints the decision: the larger of the tree and what the window earned from the last tag) and runs `changelogen` from the last `v*` tag for the changelog section,
  - regenerates `.github/assets/graph-build.svg` from a fresh production build,
  - commits `ci(changelog): update changelog and bump version` directly to `canary`,
  - tags `vX.Y.Z` at the merge boundary and pushes branch + tag atomically,
  - publishes a GitHub release whose notes mirror the changelog section.

The notes are derived after the merge; the version is already in the tree, so `main` and production carry the released number on the merge itself.

## Versioning

- **Default:** the bump `changelogen` computes from the window's commits, applied to the last tag's version: at 0.x a feature is a patch (`0.1.7 -> 0.1.8`) and a breaking commit a minor; past 1.0 the usual semver. The draft-PR workflow writes it into `package.json` on every human push to `canary` (`ci(version): bump to vX.Y.Z`), so previews show the upcoming number and production shows it on the release merge. A missing tag counts as `v0.0.0`, which is a fresh fork's first window.
- **To ship a chosen version** (for example a minor `0.2.0`): hand-set `version` in the root `package.json` on `canary` before cutting the release. It stays as long as it is ahead of what the window earns; a breaking window lifts a smaller pin to the minor it earns. A tree below the last tag stops both workflows loudly (`package.json is at X, below the last release vY`), and a version equal to the last tag is treated as untouched.
- The changelog drops `ci`-type commits (`changelog.config.json`). A release needs at least one commit that is neither `ci(changelog)` nor `ci(version)` and at least one `- ` entry in the new section, or `auto-release` no-ops (`No releasable changelog content`).

## Cutting a release

### 1. Confirm the content is on `canary`

Every PR meant for this release is squash-merged into `canary`. Check nothing that should ship is still open:

```bash
gh pr list --base canary --state open
```

### 2. (Optional) Pin the version

For anything bigger than the window earns, set `version` in the root `package.json` on `canary` first, via a normal PR, ahead of the last `v*` tag. Otherwise skip this: the tree already holds the number the window has earned.

### 3. Find the release PR

```bash
gh pr list --head canary --base main --state open
```

If it is missing (canary just became ahead, or the workflow has not run yet), trigger it and re-list:

```bash
gh workflow run auto-canary-into-main.yml --ref canary
```

### 4. Merge to production

Mark it ready and merge with a **merge commit** (never squash). This is the production action; do it only on the user's explicit go-ahead.

```bash
gh pr ready <n>
gh pr merge <n> --merge
```

### 5. Verify

```bash
gh run list --workflow=auto-release.yml -L 1     # wait for success
gh release list -L 1                             # new vX.Y.Z, marked Latest
```

The `ci(changelog): ...` commit and the new tag land on `canary`, so pull `canary` to pick them up. Production deploys from `main`. Done when the `vX.Y.Z` tag exists, the GitHub release is published as latest, and production serves the new build.

## Notes

- **Merge method is load-bearing.** `canary` PRs squash; the `canary -> main` release PR merges with a **merge commit** so `main` keeps shared history with `canary` and future release diffs stay clean. The `main` ruleset enforces this.
- **Never tag or push a release by hand.** `auto-release` owns tagging and the atomic branch + tag push; a hand-cut tag collides and fails the next run.
- **The changelog commit lands on `canary` directly, not through a PR** (it is mechanical, generated from already-reviewed PR titles). Pull `canary` after a release.
- **Backfill is automatic.** If a prior run pushed the commit and tag but died before publishing, the next run recreates the missing GitHub release instead of double-bumping.
- **A window of only `chore(deps)` commits cannot release.** changelogen hardcodes dropping non-breaking `chore(deps)` from the changelog (beyond what `changelog.config.json` can override), so the new section has no entries and `auto-release` no-ops with `No releasable changelog content`. Title dependency refreshes `build(deps)` (the `gh-commit` skill carries the rule), or land a releasable commit in the same window and re-run.
