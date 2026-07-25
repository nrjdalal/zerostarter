# Console Access: the role ladder and the allowlist

- Status: planned
- Links: PR #754 (the data table this builds on); Better Auth [admin plugin](https://www.better-auth.com/docs/plugins/admin)

## Problem Statement

Two people can reach the console today: an admin, and nobody else. `user.role` holds `admin` or `user`, and both gates are an equality check, so there is no way to let a teammate look at the platform without also handing them the power to ban accounts and grant themselves more access. The only lever is all or nothing, and the only way to pull it is a terminal script.

At the same time, anyone who finds the sign-in page can create an account. A team running an internal tool, a private beta, or a product sold to one company has no way to say "only people at our domain, plus these three addresses". Better Auth will happily create a user from any GitHub or Google identity, and there is no surface to express otherwise.

## Solution

A single console section, **Access**, answering the two questions those problems share: who may reach the console and what they may do there, and who may create an account at all.

Console access becomes a ladder, `owner > admin > member > user`. A `member` sees everything and changes nothing, which is the missing rung: support can look without being able to act. Promotion and demotion happen in the Users table, not a terminal.

Account creation becomes governed by an **Allowlist** of rules, each either a domain (`@example.com`) or a single address (`ada@example.com`). While the list is empty, anyone may join, so turning the feature on is never an outage. Once a rule exists, only matching addresses can create an account. Rules never evict anyone: offboarding is a role change or a ban.

## User Stories

1. As an owner, I want a role ladder rather than an on/off switch, so that I can give someone the console without giving them the ability to change who has the console.
2. As an owner, I want to promote and demote from the Users table, so that I do not need shell access to change who works on the platform.
3. As an owner, I want to be the only role that can create another owner, so that the top of the ladder cannot be handed out by someone below it.
4. As an owner, I want the last owner to be undemotable, so that the install can never end up with nobody in charge.
5. As an admin, I want to promote a teammate to member, so that they can start answering support questions today without waiting for the owner.
6. As an admin, I want to be unable to demote another admin or an owner, so that a disagreement between peers cannot become a lockout.
7. As an admin, I want to be unable to change my own role, so that a misclick cannot remove my own access.
8. As a member, I want to open the console and read every surface, so that I can answer a question about an account without asking someone else to look it up.
9. As a member, I want mutating controls to be absent rather than present and failing, so that I am not invited to try something the server will refuse.
10. As a user, I want the console to 404 rather than deny, so that its existence is not advertised to people who have no business there.
11. As an owner, I want role changes enforced on the server regardless of what the interface offered, so that a crafted request cannot do what the UI would not.
12. As an owner, I want a revoked or demoted person to lose access on their next request, so that offboarding does not wait on a cache.
13. As an owner, I want banning to remain independent of the ladder, so that I can cut someone off immediately without first working out their rung.
14. As an operator bootstrapping a fresh install, I want a documented way to make the first owner from the terminal, so that a brand new deployment has a way in.
15. As an operator upgrading an existing install, I want today's admins to keep exactly the powers they have, so that a migration changes nobody's day.
16. As an owner, I want to restrict sign-up to my company domain, so that only colleagues can create accounts.
17. As an owner, I want to allow a single outside address, so that a contractor can join without opening their whole domain.
18. As an owner, I want an empty allowlist to admit everyone, so that enabling the feature does not lock the world out before I have added a rule.
19. As an owner, I want the empty state to say plainly that anyone can join, so that I am never wrong about whether the gate is on.
20. As an owner, I want a rule to be previewed as I type it, so that I can see "anyone at example.com" before I commit to it.
21. As an owner, I want a duplicate rule refused with a clear message, so that the list never accumulates two ways of saying one thing.
22. As an owner, I want rules matched case-insensitively, so that `Ada@Example.com` and `ada@example.com` are the same person.
23. As an owner, I want a domain rule to admit every address at that domain, so that I do not have to enumerate my colleagues.
24. As an owner, I want a subdomain to require its own rule, so that `@example.com` does not silently admit `@mail.example.com`.
25. As an owner, I want removing a rule to leave existing accounts alone, so that tidying the list is never an eviction.
26. As a would-be user who does not match, I want a clear refusal at sign-up, so that I know to ask for access rather than assume the site is broken.
27. As an existing user whose domain was never listed, I want my account to keep working, so that a rule added today does not strand me.
28. As an owner, I want the allowlist to cover Google and GitHub sign-in as well as email, so that the rule cannot be walked around by choosing a different button.
29. As an owner, I want to see who added a rule and when, so that I can ask about one I do not recognize.
30. As an owner, I want to search and filter the rules, so that a long list stays usable.
31. As an owner, I want deletion behind a confirm, so that a stray click does not open the door.
32. As a fork author, I want the allowlist behind a feature flag, so that a starter I did not ask for is not in my nav.
33. As a fork author, I want the flag off to mean the routes 404 and the hook does nothing, so that the feature is genuinely absent rather than merely hidden.
34. As a developer, I want the ordering of roles expressed in exactly one place, so that a second comparison cannot quietly give a member write access.
35. As a developer, I want the decision logic to be pure and unit-tested, so that the rules that decide access are covered by tests rather than by hand-checking.
36. As a reader of the codebase, I want the platform role and the organization role clearly distinguished in copy, so that I do not assume one governs the other.

## Implementation Decisions

**The ladder lives on the existing column.** `user.role` (Better Auth admin plugin, text, defaulting to `user`) stays a single column and grows from two values to four. Nothing is added to the schema for roles.

| Role     | Console | Writes                           | Role changes               |
| -------- | ------- | -------------------------------- | -------------------------- |
| `owner`  | yes     | everything                       | any role, including owners |
| `admin`  | yes     | everything except granting owner | up to `member`             |
| `member` | yes     | none, every mutation is denied   | none                       |
| `user`   | no      | n/a                              | n/a                        |

- Ordering is a rank map (`owner: 3, admin: 2, member: 1, user: 0`) consulted through one predicate. Both gates ask "at least X" rather than comparing strings. A null or unrecognized value reads as `user`, so an unknown role can never grant access.
- The web console gate admits `>= member`. The API's admin middleware becomes rank-parameterized: `>= member` to read, `>= admin` to write. It keeps its uncached session read and its `banned` check, so a demotion or a ban takes effect on the next request rather than after the cookie-cache window.
- The admin plugin is configured with `adminRoles: ["owner", "admin"]` so its own privileged endpoints (ban, impersonate, set-role) refuse a member without us reimplementing them, and `defaultRole` stays `user`. This is the plugin's gate, not ours: both are required, neither substitutes for the other.
- Role changes are refused by the server on their own merits, independent of what the interface rendered: no self-change, no granting above your own rank, no acting on someone at or above your rank, and the last owner cannot be demoted. The last-owner condition is computed at the call site and handed to the guard as a boolean, so the decision logic stays free of database access.
- Migration changes no existing row. Today's `admin` and `user` values keep their meaning; `member` is simply newly reachable. The first owner is promoted by the existing roles script, which grows the new vocabulary and remains the bootstrap for a fresh install.

**The allowlist is one table and one hook.**

- A rule table holds a normalized lowercase value, its kind (`domain` or `email`), a creation timestamp, and the id of the user who added it (nullable, so a seeded rule has no author). Value is unique.
- Kind is stored rather than derived on read, so the facet filter and the list endpoint do not re-parse. It is set from the input shape: a leading `@` is a domain, anything else must parse as an address.
- Enforcement is a single `databaseHooks.user.create.before` hook in the auth package. Every sign-up path (email/password, GitHub, Google) creates a user, so one hook covers all three; refusal throws the plugin's `APIError` so the message reaches the client cleanly, rather than returning false and failing opaquely.
- An empty rule set admits everyone. The feature flag is the on/off; rules narrow it. The hook is a no-op when the flag is off.
- Matching is case-insensitive over the whole value. A domain rule matches the part after the `@` exactly, so a subdomain needs its own rule. Plus-addressing is not stripped: a domain rule admits `ada+test@example.com`, while an address rule for `ada@example.com` does not.
- The surface sits behind a feature flag in the site config alongside `waitlist`, with the same semantics: off means the routes 404, the nav drops the page, and the hook does nothing.

**Surfaces.** `Access` is a new console sidebar group below `Platform`. The allowlist page is a data-table consumer (the module's second and third consumers, counting the role select on Users), with columns for the rule, its kind, who added it and when, and a row action; the toolbar carries search and a kind facet. Adding is a dialog with a single field that infers the kind and previews the consequence in words. Roles are edited in place on the Users table rather than on a page of their own. For a member, mutating affordances are absent rather than disabled.

**API contracts.** All under the existing admin router, so the envelope, the OpenAPI wiring, and the gate come for free: list rules (`>= member`), create a rule (`>= admin`, 409 on duplicate), delete a rule (`>= admin`), and change a user's role (`>= admin`, refusing the guarded cases with a reason). The list endpoint returns the same shape the users route does, so the data table's paging contract is unchanged. Validation stays in the router with the rest, per the standing decision not to split a schema into its own file.

**One module owns every decision.** Rank, the role-change guard, rule parsing, and admission are pure functions in a single module in the auth package, taking their inputs explicitly and touching neither the database nor the request. The gates, the hook, and the routes are thin callers. This is the one seam.

## Testing Decisions

A good test here asserts the decision, not the plumbing: given a role and a requirement, is access granted; given an actor, a target and a proposed role, is the change allowed and why not; given an email and a set of rules, is the account admitted. None of it should know how a session was fetched or how a row was stored.

- **The access module is the tested seam**, at `tests/packages/auth/`. The prior art is the existing `cookieConfig` test in that same slice: a pure module in the auth package, imported directly, with no auth instance booted. That constraint is the reason this module exists rather than the logic living inside the middleware, and it is not negotiable here: importing anything that constructs the Better Auth instance or the database client throws under CI's dummy secret.
- **Rank** is tested for each rung against each requirement, including that an unknown or null value is treated as the lowest.
- **The guard** is tested for the refusal cases specifically, since those are what prevent lockouts: self-change, granting above your rank, acting on a peer, and demoting the last owner. Each refusal asserts the reason, not just the boolean, because the reason reaches the user.
- **Rule parsing** is tested for normalization (case, whitespace), for the domain and address forms, and for the inputs it must reject.
- **Admission** is tested for the empty set (admits everyone), an exact address match, a domain match, a subdomain that must not match, and case-insensitivity on both sides.
- **Everything else is verified in a browser and with curl**, as the users table was: the gate returning 404 for a user and rendering for a member, the mutating affordances being absent for a member, a role change taking effect on the next request, and a sign-up refused by the hook. There is no web render harness in this repo and this feature is not the place to introduce one.

## Out of Scope

- Organization roles. `member.role` is a separate system with overlapping vocabulary and is untouched; nothing here reads or writes it, and no console surface displays it.
- Per-permission access control. The ladder is four rungs with fixed powers, not a policy engine; the admin plugin's `ac` support is deliberately unused.
- Offboarding flows. Removing a rule does not review, notify, or act on accounts that no longer match.
- Merging with the waitlist. The two surfaces stay separate in this change, even though one collects people who want in and the other decides who gets in.
- Wildcards and subdomain matching beyond an exact domain, and any regular-expression rule form.
- Invitations, approval queues, and anything that lets a person request access rather than be granted it.
- Audit history for role changes. Who changed whom and when is not recorded beyond the row's current state.

## Further Notes

The two halves ship together because the allowlist's own permissions are rungs of the ladder: reading the rules is a member power, changing them is an admin power. Building the allowlist first would mean writing its gates twice.

The platform ladder deliberately reuses three of the organization plugin's four role names. That was weighed and accepted: the systems are separate columns on separate tables, the compiler always knows which is which, and `admin` already appears in both today without trouble. The residual cost is a copy discipline, and it only comes due if an organization-roles surface ever ships, at which point that surface says "Organization role" and the console keeps saying "Role".

Two questions are genuinely open and should be answered while building rather than guessed now: whether a member should see the Users table at all, given it lists every account's email address, and whether the console gate's 404 should become a 403 for a signed-in user who is merely too junior, which is friendlier but confirms the console exists.

## Build order

1. The access module and its tests: rank, guard, rule parsing, admission.
2. The ladder wired through both gates, the plugin's `adminRoles`, the roles script vocabulary, and the owner bootstrap.
3. The role-change endpoint and the Users table's role select.
4. The allowlist table and migration, the create hook, and the feature flag.
5. The allowlist API and its console page.
6. Docs (authentication for the ladder, a page or section for the allowlist, api-conventions for the rank-parameterized middleware) and the `design`, `api-endpoint`, and `codebase-map` skills, in the same change.
