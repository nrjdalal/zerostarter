# Standardize and pin the release-workflow tooling

- Status: backlog
- Links: PR #683 (JSON tool standardized on `json`)

The release workflows (`auto-release.yml`, `cli-release.yml`) shell out to several bunx tools. JSON edits are now standardized on `bunx json -I` across both (fx dropped: smaller, zero-dep, native in-place, already the incumbent; the runtime gap is negligible at release cadence). The consistency threads that remain, deferred:

- **Pin the bunx tools.** `bunx changelogen`, `bunx oxfmt`, `bunx json`, `bunx semver` are all unpinned (`@latest`). Pin them to explicit versions for supply-chain safety and reproducible releases (see the pin-package-versions convention).
- **Unify JSON reads.** Field reads are split between `bun -e 'JSON.parse(...)'` (auto-release's `AUTO_VERSION` and `NEW_VERSION`) and `bunx json` (cli-release's package name and the npm dist-tags). Both work; pick one for consistency. Bun-native is faster and dependency-free for reads, so leaning that way, with `bunx json -I` kept for the in-place edits.
- **Pass version strings through env.** `auto-release.yml` interpolates `$TARGET_VERSION` (from `release-version.ts`, which reads canary's `package.json` and the repo's own `v*` tags) and `$AUTO_VERSION` (changelogen's own bump) into inline `bunx json -e "..."` and `sed` bodies. Both come from reviewed commits and write-access actors, so nothing untrusted reaches them today; hand them over as `process.env` reads and validate against a semver pattern first, so the step never depends on that staying true (deepsec audit 2026-09-06, item 10).
