# Tests for the postinstall dependency manager

- Status: backlog
- Links: relevance audit 2026-09-19 (item 8), PR #745 (the caret rule)

`.github/scripts/deps-manager.ts` runs on every `postinstall`. It sorts the root catalog, promotes a dependency that every workspace pins identically into the catalog, rewrites each workspace spec to `catalog:`, and turns exact and tilde catalog specs into caret ranges, which is the rule `AGENTS.md` states as having no opt-out. It ships to forks. Nothing tests it.

It opened with a "replace later" note from its first commit in 2025-11. The note is gone: the script has been extended by hand since, reads soundly, and does not need replacing. What it lacks is a test, and two things stand in the way, both small:

- The decisions are pure functions (`toCaretRange`, `normalizeCatalogRanges`, `pickSafeMoves`, `sortObjectDeep`) but none is exported.
- The file calls `main()` at module scope, so importing it from a test would rewrite the repo's own manifests. It needs an `import.meta.main` guard.

With those two changes the test lives at `tests/github/scripts/deps-manager.test.ts`, beside the other script tests. Worth pinning: an exact and a tilde spec both become carets; a prerelease and a build suffix survive; `workspace:`, `npm:`, git and URL specs are left alone; a wildcard, a dist-tag and a compound range are reported rather than rewritten; a dependency pinned at two different versions across workspaces is reported, not promoted.
