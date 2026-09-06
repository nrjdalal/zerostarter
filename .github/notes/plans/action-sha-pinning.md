# Actions on mutable major tags in token-bearing workflows

- Status: icebox
- Links: deepsec audit 2026-09-06 (item 11), PR #819

## The concern

`auto-labeler.yml` (`pull_request_target` with `issues: write` and `pull-requests: write`) and `cli-release.yml` (the npm publish, with `NPM_TOKEN` and `id-token: write`) reference `actions/checkout@v6`, `actions/github-script@v8`, `actions/setup-node@v6` and `oven-sh/setup-bun@v2` by mutable major tag. A repointed tag would run in those privileged contexts.

## Context

Official actions on major tags is the convention in every workflow here and in most of the ecosystem. GitHub's hardening guide recommends full commit SHAs with Dependabot for Actions keeping them fresh; the cost is a Dependabot PR per action release and a less readable `uses:` line. The [tooling plan](workflow-tooling-consistency.md) already tracks pinning the bunx tools these same workflows shell out to.

## Open question

Pin every action to a commit SHA with Dependabot for Actions enabled, pin only the two privileged workflows, or accept major tags as the repo's standing convention and record that, so the next audit does not re-raise it.
