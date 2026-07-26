# No trail for console role changes

- Status: icebox
- Links: PR #758 review

An allowlist rule records who added it and when. A role change records nothing: `user.role` is overwritten in place, so the table that decides who can ban accounts, read every address, and grant further access keeps no history of who granted what.

Both the API and the roles script write the column directly, so a trail means a second table (actor, target, from, to, timestamp) written by every path that changes a role, plus a surface to read it and a retention answer. The guards make the current state defensible (nobody acts at or above their own rank, the last owner cannot be demoted), and the console is small enough that the state is usually the whole story.

Open question: is this an audit-log concern that should cover more than roles (bans, impersonation, allowlist edits already carry an author) rather than a role-specific table? Building it per-feature is how you end up with three half-logs.
