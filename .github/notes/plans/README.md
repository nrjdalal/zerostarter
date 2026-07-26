# Plans

The curated backlog of everything not yet done: in-progress work, planned features, ideas, and known cleanups. One file per item in this folder, each carrying a status and a link to its history (closed issue, branch, or PR). GitHub issues are the inbox for new bugs and requests; fold each in here and close it once captured, so this stays the single backlog rather than a parallel one.

Distinct from the dated code audits in `../audits/` (transient, deleted once addressed) and the dependency-audit register in `../dependencies.md`. An item gets a full spec once it moves to `planned`.

This is the internal, fork-excluded backlog. It is separate from the published `web/next/content/docs/getting-started/roadmap.mdx` (the curated public roadmap that ships to forks); keep the two from drifting.

## In progress

- [TanStack Start migration](tanstack-start-migration.md) - complete and verified locally, blocked on the Vercel Bun-runtime deploy (#650).
- [Hardening refactors from the external evaluation](hardening-refactors.md) - gate the agent sign-in behind an explicit secret, read the auth secret directly, and gate tests + check-types in PR CI.

## Planned

- [Dynamic per-branch preview URLs](dynamic-preview-urls.md) - predictable per-branch preview URLs on our own domains via alias-on-deploy (#677).

## Backlog / ideas

- [Passkey (WebAuthn) sign-in and management](passkey.md) - #594.
- [More deployment adapters, methods and platforms](deployment-adapters.md) - #154.
- [Feature flags via PostHog or a service](feature-flags.md) - #153.
- [A logo](logo.md) - #113.
- [A better landing page](landing-page.md) - #26.
- [Bun-native file APIs in .github/scripts](bun-native-scripts.md) - #423.
- [Org-creation name and other restrictions](org-creation-restrictions.md) - #349.
- [Standardize and pin the release-workflow tooling](workflow-tooling-consistency.md) - deferred from #683 (JSON tool standardized on `json`; pinning + read-helper unification left).
- [Batch the console's bulk writes](api-batch-writes.md) - one request per selected row spends most of a 120/min budget on one click, and the fan-out serializes at the owner lock anyway; the blocker is deciding what a partial success looks like in the envelope (#759).
- [An API route harness](api-route-test-harness.md) - the last-owner FOR UPDATE, the ban compare-and-set and the sign-in grant hook are only checked by hand; a mock cannot tell you whether a lock blocks (PR #758 review).
- [Unit-test the pure web seams](web-content-source-tests.md) - the contentSource gate and the data-table layout math; needs a web test harness first (PR #691, #754 reviews).
- [Console not-found status and the anonymous white flash](console-notfound-status.md) - a layout-thrown notFound cannot unwind into an already-streaming parent: console 404s soft-200, and an anonymous visit paints white before hydrating; middleware is the real fix (PR #691, #758 reviews).
- [Derive BlogPostMeta from the blog zod schema](blog-meta-from-schema.md) - carved out of content-source-consolidation; a decouple-vs-derive tradeoff, not a mechanical rename (PR #691 review).

### Architecture deepenings (2026-07-12 review, deep-module lens)

Candidate refactors that turn a scattered cluster into one deep module, ordered by strength.

- [Own the fork boundary with one forkLayout module](cli-fork-layout.md) - in progress on `refactor/cli-fork-layout`; one `.gitpickignore` parser feeds convert + sync + tests.
- [One nav model and a deep SidebarShell](sidebar-nav-model.md) - collapse close/active/item-shape across the three sidebars; delete `sidebar-adaptive.tsx`.
- [One typed API envelope and a defineRoute helper](api-envelope-typed-endpoint.md) - shared `Envelope<T>` + boilerplate collapse; subsumes #664.
- [Consolidate OG rendering behind one seam](og-render-consolidation.md) - #485; broadened to own size + URL scheme + defaults.
- [Consolidate env into one schema with callable validation](env-schema-consolidation.md) - speculative; collapses shared-key duplication and import-time coupling.

## Icebox

Raised but undecided: real concerns with no agreed next action and no confident verdict. They sit here rather than in the backlog (which implies a plan) or closed (which loses the context), and leave only by being decided. Mirrored as checkboxes on the standing Icebox issue (#707).

- [RSS feed](rss-feed.md) - built and removed on #744; ship by default, feature-flag it, or leave it to forks.
- [No trail for console role changes](console-role-audit.md) - roles are overwritten in place with no record of who granted what; probably an audit-log concern wider than roles (#758 review).
- [A shared contracts package](shared-contracts-package.md) - validation schemas live inside their router, so numbers are stated twice and cannot be unit tested; a types package would fix both and add a second home for a contract (#754 review).
- [Data table offset pagination](data-table-offset-pagination.md) - batches can skip or repeat a row mid-scroll, and a repeat aliases selection; keyset is the fix but moves the contract (#754 review).
