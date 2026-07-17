# Plans

The curated backlog of everything not yet done: in-progress work, planned features, ideas, and known cleanups. One file per item in this folder, each carrying a status and a link to its history (closed issue, branch, or PR). GitHub issues are the inbox for new bugs and requests; fold each in here and close it once captured, so this stays the single backlog rather than a parallel one.

Distinct from the dated code audits in `../audits/` (transient, deleted once addressed) and the dependency-audit register in `../dependencies.md`. An item gets a full spec once it moves to `planned`.

This is the internal, fork-excluded backlog. It is separate from the published `web/next/content/docs/getting-started/roadmap.mdx` (the curated public roadmap that ships to forks); keep the two from drifting.

## In progress

- [Build-time deploy-mode detection](build-time-deploy-mode.md) - implemented on `feat/build-time-deploy-mode` (#721): the web/api deployment shape resolves at build via tldts (dev-only) and bakes a `DEPLOY_MODE` literal both bundles read; supersedes the runtime detection in #720 (#719).
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

Raised but not yet triaged into a decision, kept out of both the backlog above and a closed issue. The standing at-a-glance index is issue #707; one write-up per item lives here.

- [Handoff route regression tests](handoff-route-tests.md) - mode-gate 404, single-use replay, wrong-nonce; blocked on an api integration-test harness (#720 review).
- [Split-mode web cookie lifetime drift](handoff-cookie-lifetime.md) - SSR expires the session at its original lifetime on long-lived sessions (#720 review).
- [Split-mode OAuth callback login-CSRF](split-oauth-callback-binding.md) - decided: accepted as a known tradeoff (`skipStateCookieCheck`); the tighter callback-to-nonce binding is a deferred optional hardening (#720 review).
