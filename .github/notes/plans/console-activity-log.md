# A console activity log

- Status: shipped in PR #762 (awaiting review)
- Links: PR #758 review (raised); graduated from the icebox once the shape was decided; built in PR #762

An allowlist rule records who added it and when. A role change records nothing: `user.role` is overwritten in place, so the table that decides who can ban accounts, read every address, and grant further access keeps no history of who granted what.

Both the API and the roles script write the column directly, so a trail means a second table (actor, target, from, to, timestamp) written by every path that changes a role, plus a surface to read it and a retention answer. The guards make the current state defensible (nobody acts at or above their own rank, the last owner cannot be demoted), and the console is small enough that the state is usually the whole story.

That open question is decided: one general log, not a role table. A role-only history would leave a ban, the most consequential thing the console does, recording nothing, and building it per feature is how you end up with three half-logs.

## Shape

One `activity` table with a typed event per write, an actor that may be a person or a rule, and a label stored beside every id so a row still reads after its target is deleted (an allowlist rule is gone by the time its removal is read). `Console > Activity`, admin and above, on the same server-driven table as the rest.

Written by every path that changes access: the role route, the status route, allowlist add and remove, the sign-in grant, `console:roles`, and the agent bootstrap. The write shares the transaction with the change it describes, so a recorded event always means the change happened, and a change can never happen unrecorded. The one exception is the sign-in grant, which is best effort by design so a database failure cannot stop anyone signing in.

Deliberately not feature-flagged: a flag on a log means silent gaps in it.

## What shipped

As above, with three changes the shape argument produced. It is named `activity`, not `audit_log`, because an audit log promises completeness, retention and tamper-evidence that this does not provide. The event is flat (`actor`, `action`, `summary`, `createdAt`) with a prose summary rather than a target type and a before/after payload, so a row is readable at a glance. And both console tables share `schema/console.ts`, with `allowlist` gaining the same `actorId`/`actor` pair, which also fixed a rule whose deleted author rendered as "Seeded".

## Left open

Retention. The table grows without bound and nothing prunes it; the docs say so and leave the policy to the install.

Indexes. Shipped with none, deliberately, to keep the first version simple. The list is `ORDER BY created_at DESC LIMIT n`, so `created_at` is the one worth adding first. The action facet is not a single-column case: five values means roughly a fifth of the table each, so the planner scans anyway, and the answer if a filtered page ever feels slow is a composite `(action, created_at)` that filters and orders in one pass.
