# Plans

The curated backlog of everything not yet done: in-progress work, planned features, ideas, and known cleanups. One file per item in this folder, each carrying a status and a link to its history (closed issue, branch, or PR). GitHub issues are the inbox for new bugs and requests; fold each in here and close it once captured, so this stays the single backlog rather than a parallel one.

Distinct from the dated code audits in `../audits/` (transient, deleted once addressed) and the dependency-audit register in `../dependencies.md`. An item gets a full spec once it moves to `planned`.

This is the internal, fork-excluded backlog. It is separate from the published `web/next/content/docs/getting-started/roadmap.mdx` (the curated public roadmap that ships to forks); keep the two from drifting.

## In progress

- [TanStack Start migration](tanstack-start-migration.md) - complete and verified locally, blocked on the Vercel Bun-runtime deploy (#650).

## Planned

- [Dynamic per-branch preview URLs](dynamic-preview-urls.md) - predictable per-branch preview URLs on our own domains via alias-on-deploy (#677).

## Backlog / ideas

- [Passkey (WebAuthn) sign-in and management](passkey.md) - #594.
- [More deployment adapters, methods and platforms](deployment-adapters.md) - #154.
- [Feature flags via PostHog or a service](feature-flags.md) - #153.
- [A logo](logo.md) - #113.
- [A better landing page](landing-page.md) - #26.
- [Org-creation name and other restrictions](org-creation-restrictions.md) - #349.
- [Standardize and pin the release-workflow tooling](workflow-tooling-consistency.md) - deferred from #683 (JSON tool standardized on `json`; pinning, read-helper unification and the version pass-through left).
- [OpenAPI: the WS upgrade route lists inapplicable 429/500 responses](openapi-ws-responses.md) - #664; subsumed by api-envelope-typed-endpoint, but shippable on its own as the smaller fix.
- [An API route harness](api-route-test-harness.md) - the last-owner FOR UPDATE, the ban compare-and-set and the sign-in grant hook are only checked by hand; a mock cannot tell you whether a lock blocks (PR #758 review).
- [Next.js 16.3 adoption](next-163-adoption.md) - what was taken (`agentRules: false`, PR #786), what was measured and declined (the Rust React Compiler, ~6% here against a claimed 34-46%), and what Instant Navigations costs: `cacheComponents` spiked to 10 of 14 routes 500ing, with the blocker list.
- [Unit-test the pure web seams](web-content-source-tests.md) - the contentSource gate, which needs module mocks for the generated fumadocs source and `next/navigation`; the data-table layout math is already covered (PR #691, #754 reviews).
- [Console not-found status and the anonymous white flash](console-notfound-status.md) - a layout-thrown notFound cannot unwind into an already-streaming parent: console 404s soft-200, and an anonymous visit paints white before hydrating; middleware is the real fix (PR #691, #758 reviews).
- [Derive BlogPostMeta from the blog zod schema](blog-meta-from-schema.md) - carved out of content-source-consolidation; a decouple-vs-derive tradeoff, not a mechanical rename (PR #691 review).
- [Security headers and a durable rate-limit store](hardening-refactors.md) - what is left of the external evaluation's hardening list: its three named items shipped (CI gates, `serverSecret`, the agent sign-in toggle); default security headers and CSP, a rate-limit store that survives a restart, and the env-shape tests did not.
- [WebSockets on Vercel through Bun.serve()](vercel-bun-serve-websockets.md) - the Node adapter split exists because Vercel could not run `Bun.serve()`; its Bun runtime now can, in beta and with documented differences, which would let one code path serve every host.
- [Tests for the postinstall dependency manager](deps-manager-tests.md) - `.github/scripts/deps-manager.ts` rewrites every manifest on install and enforces the catalog's caret rule, with no test behind it; its helpers are pure but unexported, and the file runs on import.
- [CLI developer experience](cli-dx.md) - what the 2026-07-04 CLI audit left open: `--dry-run` on `reinit` and `sync`, a `--ref` with a provenance stamp, a confirm on `sync`, an update notice, tests for the two untested commands, `--verbose`, and one constant for the gitpick pin.
- [Activity log retention and indexes](console-activity-log.md) - the log shipped in PR #762 with no retention and no indexes, both deliberately; the table grows without bound, and `created_at` is the first index worth adding once the list feels slow.

### Architecture deepenings (2026-07-12 review, deep-module lens)

Candidate refactors that turn a scattered cluster into one deep module, ordered by strength.

- [One nav model and a deep SidebarShell](sidebar-nav-model.md) - collapse close/active/item-shape across the three sidebars; delete `sidebar-adaptive.tsx`.
- [One typed API envelope and a defineRoute helper](api-envelope-typed-endpoint.md) - shared `Envelope<T>` + boilerplate collapse; subsumes #664.
- [Consolidate OG rendering behind one seam](og-render-consolidation.md) - #485; broadened to own size + URL scheme + defaults.
- [Consolidate env into one schema with callable validation](env-schema-consolidation.md) - speculative; collapses shared-key duplication and import-time coupling.

## Icebox

Raised but undecided: real concerns with no agreed next action and no confident verdict. They sit here rather than in the backlog (which implies a plan) or closed (which loses the context), and leave only by being decided. Mirrored as checkboxes on the standing Icebox issue (#707).

- [The rate limiter's client-IP resolution](rate-limit-ip-resolution.md) - **top priority**: on any deploy where Bun owns the socket a forged `x-forwarded-for` names its own bucket and a header-less client gets a fresh random key, so anonymous limiting is off; `@arcjet/ip` is already the resolver but is called bare, so use it as its adapters do, with `platform`, `proxies` and the socket peer (deepsec audit 2026-09-06, built and reverted on #819).
- [Gating who may create an account](signup-gating.md) - the Access spec's other half, retired when the allowlist became a console grant; a second list, a fork-edited predicate, or nothing at all (#758).
- [RSS feed](rss-feed.md) - built and removed on #744; ship by default, feature-flag it, or leave it to forks.
- [A shared contracts package](shared-contracts-package.md) - validation schemas live inside their router, so numbers are stated twice and cannot be unit tested; a types package would fix both and add a second home for a contract (#754 review).
- [Data table offset pagination](data-table-offset-pagination.md) - batches can skip or repeat a row mid-scroll, and a repeat aliases selection; keyset is the fix but moves the contract (#754 review).
- [Actions on mutable major tags in token-bearing workflows](action-sha-pinning.md) - pin every action to a commit SHA with Dependabot for Actions, pin only the two privileged workflows, or record major tags as the convention (deepsec audit 2026-09-06).
- [Lighthouse follow-ups that are product tradeoffs](lighthouse-followups.md) - deferring PostHog and raising the browser floor, scoping the fumadocs stylesheets out of the root, a long cache lifetime for stable-named marketing assets, and pausing the grain off-screen; each buys a small number at a visible cost (Lighthouse audit 2026-07-04, PR #653).
- [An authenticated WebSocket pattern](websocket-auth-ticket.md) - the one shipped socket is public, and nothing shows a fork how to open one as a signed-in user; ship a worked ticket pattern, document it, or keep the one sentence in the `api-endpoint` skill.
- [The public-suffix /api rewrite bills a Vercel hop](rate-limit-rewrite-bucket.md) - pre-existing: on a `*.vercel.app` host every visitor shares one anonymous bucket on that path; an echo route on a preview API would show which header carries the client (deepsec audit 2026-09-06).
