# Own the fork boundary with one forkLayout module

- Status: in progress
- Links: 2026-07-12 architecture review (deep-module lens); branch `refactor/cli-fork-layout`

`.gitpickignore` is the source of truth for a fork's excludes and its `# PRESERVE_ON_SYNC` directive, but it was parsed in two places: `removeForkExcludes` (`src/convert.ts`, init) read the local file and removed each excluded path, and `parsePreserve` (`src/pkg.ts`, sync) parsed the directive from the remotely-fetched text. Two parsers of one file, in two modules.

Done: a single pure `parseForkLayout(gitpickignore) -> { excludes, preserve }` (`src/fork-layout.ts`) that both callers read from. `removeForkExcludes` iterates `.excludes` (keeping its literal-path guard at the removal site, where globs actually matter); sync reads `.preserve`. `parsePreserve` is gone from `pkg.ts`; its unit tests move to `test/fork-layout.test.ts`, which also parses the real `.gitpickignore` (20 excludes, 5 preserve).

Deliberately out of scope (would over-scope the module, not deepen it): the single `HIRE_NAV` strip and `fixDangling`'s shared-file reconciliation stay their own concern (one strip is not a data-driven `strips` array), and the local-vs-remote sourcing is unchanged.
