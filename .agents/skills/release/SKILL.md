---
name: release
description: Cut a production release by promoting canary to main. Use when asked to cut, ship, or publish a release, pin or tag a version, push canary to production, or recover a failed release run.
source: local
---

# Release

Releases ship by promoting `canary` to `main` with a merge commit, and `main` deploys to production. `.github/workflows/auto-canary-into-main.yml` opens the draft release PR on every push to `canary` and moves the root `package.json` version to what the window has earned (`ci(version): bump to vX.Y.Z`); `auto-release.yml` writes the changelog, tags, and publishes the GitHub release after the merge; `packages/scripts/src/release-version.ts` decides the number, and its header holds the rules. In the canonical starter, `cli-release.yml` (fork-excluded) then publishes the CLI to npm from the tag.

## 1. Confirm the content is on `canary`

```bash
gh pr list --base canary --state open
```

A draft never ships; a ready PR meant for this release merges first. Done when nothing listed and ready is meant to ship in this release.

## 2. Pin the version when the window earns too little

```bash
bun run release:version    # prints current, earned, moved, next and tag: next is what ships
```

A hand-set `version` in the root `package.json`, ahead of the last `v*` tag, ships as long as it is ahead of what the window earns, since the tree moves forward only. Land it on `canary` through a PR like any change. Done when `bun run release:version` prints the wanted `next`.

## 3. Find the release PR

```bash
gh pr list --head canary --base main --state open
gh workflow run auto-canary-into-main.yml --ref canary    # when missing
```

Done when exactly one open `canary` into `main` PR exists.

## 4. Merge to production

The production action: run it on the user's explicit go.

```bash
gh pr ready <n>
# a head the workflow pushed has its pull_request build held for approval instead of running; approve it
RUN=$(gh run list --branch canary --workflow auto-check-build.yml --json databaseId,conclusion,headSha \
  --jq "[.[] | select(.headSha == \"$(gh pr view <n> --json headRefOid --jq .headRefOid)\")][0] | select(.conclusion == \"action_required\") | .databaseId")
[ -n "$RUN" ] && gh api -X POST "repos/{owner}/{repo}/actions/runs/$RUN/approve" && gh run watch "$RUN" --exit-status
gh pr review <n> --approve
gh pr merge <n> --merge
```

When the head is a commit the workflow pushed (the `ci(version)` bump, typically the window's first push), GitHub holds its `pull_request` build as `action_required`, and without the approval the PR merges with no build check, since `main`'s ruleset asks for one review and no status checks; a human-merged head builds by itself, and the lookup finds nothing. `--merge` because `main` keeps `canary`'s history, so the next release PR diffs only its own window; the ruleset allows no other method. If `canary` moves while the PR is open, the push dismisses the review and the new head brings its own run, held again when the workflow pushed it. A fork whose `main` requires status checks needs the held run approved before the merge state reads `CLEAN`. Done when the held run, where there is one, passed under `gh run watch --exit-status`, `gh pr view <n> --json mergeStateStatus` reads `CLEAN`, and the PR merges with a merge commit.

## 5. Verify

```bash
gh run list --workflow=auto-release.yml -L 1    # success
gh release list -L 1                            # the new vX.Y.Z, marked Latest
git pull origin canary                          # the ci(changelog) commit and the tag land on canary, pushed together
```

Targets when the run stops short:

- `No releasable commits since` or `No releasable changelog content` in its log means the window kept nothing the changelog counts (the `gh-commit` skill names the types that do). Land a releasable commit and merge the next release PR.
- A failed run is re-run with `gh run rerun --failed <id>`: `auto-release` owns the tag (a hand-cut one moves the window's anchor or collides with the next run's), and a run that tagged but died before publishing is backfilled by the next one.
- Canonical starter only: `cli-release.yml` publishes the CLI after a successful `auto-release`; a failed publish leg is re-published by `gh workflow run cli-release.yml --ref canary`, since a re-run replays its own workflow file.

Done when the run is a success, the new tag is latest, and `canary` is pulled.
