# Plans

The curated backlog of everything not yet done: in-progress work, planned features, ideas, and known cleanups. One file per item in this folder, each carrying a status and a link to its history (closed issue, branch, or PR). GitHub issues are the inbox for new bugs and requests; fold each in here and close it once captured, so this stays the single backlog rather than a parallel one. The one standing exception is the [Icebox](#icebox) (issue #707), which stays open permanently as the index for undecided, on-ice items.

Distinct from the dated code audits in `../audits/` (transient, deleted once addressed) and the dependency-audit register in `../dependencies.md`. An item gets a full spec once it moves to `planned`.

This is the internal, fork-excluded backlog. It is separate from the published `web/next/content/docs/getting-started/roadmap.mdx` (the curated public roadmap that ships to forks); keep the two from drifting.

## In progress

- [TanStack Start migration](tanstack-start-migration.md) - complete and verified locally, blocked on the Vercel Bun-runtime deploy (#650).
- [Hardening refactors from the external evaluation](hardening-refactors.md) - gate the agent sign-in behind an explicit toggle, read the auth secret directly, and gate tests + check-types in PR CI.
- [ZeroStarter tracked against the external evaluation](saas-starter-evals.md) - the full P0 to P3 eval backlog as a roadmap; P0 is in progress (executed via hardening-refactors.md).

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
- [Unit-test the contentSource seam](web-content-source-tests.md) - the load-bearing web gate; needs a web test harness first (PR #691 review).
- [Console not-found returns HTTP 200](console-notfound-status.md) - pre-existing force-dynamic soft-404, admin-only, low severity (PR #691 review).
- [Derive BlogPostMeta from the blog zod schema](blog-meta-from-schema.md) - carved out of content-source-consolidation; a decouple-vs-derive tradeoff, not a mechanical rename (PR #691 review).

### Architecture deepenings (2026-07-12 review, deep-module lens)

Candidate refactors that turn a scattered cluster into one deep module, ordered by strength.

- [Own the fork boundary with one forkLayout module](cli-fork-layout.md) - in progress on `refactor/cli-fork-layout`; one `.gitpickignore` parser feeds convert + sync + tests.
- [One nav model and a deep SidebarShell](sidebar-nav-model.md) - collapse close/active/item-shape across the three sidebars; delete `sidebar-adaptive.tsx`.
- [One typed API envelope and a defineRoute helper](api-envelope-typed-endpoint.md) - shared `Envelope<T>` + boilerplate collapse; subsumes #664.
- [Consolidate OG rendering behind one seam](og-render-consolidation.md) - #485; broadened to own size + URL scheme + defaults.
- [Consolidate env into one schema with callable validation](env-schema-consolidation.md) - speculative; collapses shared-key duplication and import-time coupling.

## Icebox

Undecided, on-ice items: raised but not yet triaged into a decision, so neither promised nor rejected. Each may later graduate to the backlog above, ship directly, be dismissed as not worth it, turn out not to be a real problem, or prove to be a false claim. Mirrored in the standing [issue #707](https://github.com/nrjdalal/zerostarter/issues/707) (the GitHub-visible index, which stays open permanently); see it for the full explanation.

- [Rate limiter's anonymous IP key](rate-limit-client-ip.md) - spoofable today and fail-open when no IP resolves; sibling of the eval's P0-4, where the trusted-proxy decision belongs.
- [Portless local URLs, follow-ups](portless-local-urls.md) - four loose ends from #702: fork portless name, remove `HONO_APP_URL` (blocked on the deferred auth change), parallel worktree dev ports, and an authenticated WS ticket.
