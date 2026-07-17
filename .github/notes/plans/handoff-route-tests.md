# Handoff route regression tests (mode gate, single-use, wrong-nonce)

- Status: iceboxed (raised in #720 review, low severity)
- Links: #720 · #721 (build-time successor) · related test-harness gaps (`web-content-source-tests.md`)

**Concern.** The unit tests cover the pure deploy primitives well (the `resolveDeployMode` truth table, the runtime assembly, the handoff token shape), but nothing covers the security-critical _route_ behaviors: the api mode gate 404ing outside split, the web claim route 404ing outside split, `consumeVerificationValue` single-use (replay dead), and a wrong nonce forming a non-matching identifier that consumes nothing. These were verified by hand on a live pair, which does not survive into CI. For a starter template forks inherit, the replay test in particular is worth encoding.

**Open question / blocker.** The handoff routes depend on `auth.$context` (Better Auth's DB-backed verification adapter), so they need an api integration-test harness (a test DB, or a mocked `internalAdapter`) that this repo does not have yet, the same gap that parks other route/integration tests. Whether to stand up that harness or mock the adapter is the undecided part. No verdict.
