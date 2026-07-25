# A shared contracts package (@packages/types or similar)

- Status: icebox
- Links: PR #754 review

Validation contracts currently live inside the router that uses them: `usersQuerySchema` (the `page`/`perPage` bounds, the role dedupe-and-enum pipe, the trimmed `q` cap) sits in `api/hono/src/routers/admin.ts`, and the web side re-derives what it needs through Hono RPC inference plus a hand-written mirror of the same numbers (`Q_MAX`, `ROLE_VALUES` in the users table).

That has two consequences. The numbers are stated twice, once per side, and nothing links them. And the schemas cannot be unit tested: importing a router to reach one boots the db client and Better Auth, which throws on CI's dummy secret, so the only api-side helpers reachable from a test are ones that already live outside a router (`lib/sql.ts`). PR #754 briefly lifted the schema into its own file to test it and reverted: a file per schema is fragmentation driven by the test runner rather than by the design. (The same PR did lift the data table's layout math into `lib/`, which is the distinction: that is one cohesive body of pure logic shared by every table, not one file per contract.)

A shared package that both sides import would collapse the duplication and make the contracts testable in one place. It also cuts against the grain of what makes the current setup pleasant: RPC inference means the web never hand-writes request or response types today, and a types package is a second place for a contract to live, which is exactly the drift this repo avoids elsewhere.

Open question: is there enough shared contract surface to justify a package, or does this stay a two-table coincidence until a third consumer (the CLI, a webhook, a second app) actually needs the same schema? Nobody has measured how much would move.
