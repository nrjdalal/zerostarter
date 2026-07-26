# An API route harness, for the rules that only exist where code meets the database

- Status: backlog
- Links: PR #758 review

The access rules are pure functions with 43 unit tests, and that is most of the safety. What has none is the seam where those functions meet a query, which is exactly where this section's load-bearing behaviour lives:

- **The last-owner race.** `SELECT id FROM "user" WHERE role = 'owner' FOR UPDATE` inside the transaction is what stops two admins each demoting one of the last two owners. Nothing catches its removal: the guard's own tests keep passing, because the guard is handed a count it trusts.
- **The status route's compare-and-set.** Banning quals on the rung the guard read, so a promotion landing mid-request makes the write find nothing rather than act on a stale decision. Delete the qual and every test still passes.
- **The sign-in grant hook.** Never lowers anyone, skips an impersonated session, writes only when the rung it read still holds, and swallows its own failures so nothing can block a sign-in. Four behaviours, no test.
- **Ban's two writes as one transaction**, so a failed session sweep cannot leave a flagged account signed in.

Each was verified by hand against the running stack, which is worth something and reruns never.

What it needs is a harness that can start the Hono app against a real Postgres and drive it as a client, with a per-test database (a template database, or a schema per worker) so a transaction test can actually open two connections and race them. Testcontainers or a disposable Neon branch both fit; the deciding question is what CI can start cheaply, since the suite today is `bun test` over pure modules with no services.

Not urgent, and deliberately not faked with a mocked driver: a mock cannot tell you whether `FOR UPDATE` blocks, which is the entire claim.
