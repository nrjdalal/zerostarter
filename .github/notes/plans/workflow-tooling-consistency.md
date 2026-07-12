# Standardize and pin the release-workflow tooling

- Status: backlog
- Links: PR #683 (JSON tool standardized on `json`)

The release workflows (`auto-release.yml`, `cli-release.yml`) shell out to several bunx tools. JSON edits are now standardized on `bunx json -I` across both (fx dropped: smaller, zero-dep, native in-place, already the incumbent; the runtime gap is negligible at release cadence). Two consistency threads remain, deferred:

- **Pin the bunx tools.** `bunx changelogen`, `bunx oxfmt`, `bunx json`, `bunx semver` are all unpinned (`@latest`). Pin them to explicit versions for supply-chain safety and reproducible releases (see the pin-package-versions convention).
- **Unify JSON reads.** Field reads are split between `bun -e 'JSON.parse(...)'` (auto-release) and `bunx json -f -a` (cli-release). Both work; pick one for consistency. Bun-native is faster and dependency-free for reads, so leaning that way, with `bunx json -I` kept for the in-place edits.
