# Tickets: Console Access

Vertical slices for the role ladder and the allowlist, specified in [console-access.md](console-access.md). Each slice cuts a complete path through the stack and is demoable on its own.

Work the **frontier**: any ticket whose blockers are all done. Docs and skills move with the change that causes them, so each ticket carries its own, and there is no trailing documentation ticket.

## The console opens to a member, read-only

**What to build:** someone granted the new `member` role can open the console and read every surface, while changing nothing. A `user` still gets a 404, and today's admins keep everything they have. The ladder becomes the thing both gates consult, rather than an equality check on one string.

The access module lands here with the rank ordering and the "at least" predicate that every gate asks. The web console gate admits `member` and above; the API's admin middleware becomes rank-parameterized, reading at `member` and writing at `admin`, keeping its uncached session read and its banned check so a demotion lands on the next request. The admin plugin is told which roles count as its own admins, so its ban, impersonate and set-role endpoints refuse a member without us reimplementing them. The roles script grows the four-value vocabulary, which is also how the first owner is created on a fresh install. The console makes the viewer's rank available to its surfaces so a member's mutating affordances are absent rather than disabled.

**Blocked by:** None, can start immediately.

- [ ] Rank ordering and the predicate are unit-tested, including that null and unrecognized values read as the lowest rung
- [ ] A member loads the console and reads the Users table; the row actions are not rendered
- [ ] A user gets a 404 from the console and a 403 from the admin API
- [ ] An existing admin's powers are unchanged, and no existing row is rewritten by the migration
- [ ] The admin plugin's own privileged endpoints refuse a member
- [ ] The roles script grants and lists all four roles, and documents the owner bootstrap
- [ ] A demotion takes effect on the demoted user's next request, not after the cookie-cache window
- [ ] Authentication and API-convention docs describe the ladder and the rank-parameterized middleware

## Roles change from the Users table

**What to build:** an admin promotes and demotes people from the Users table instead of the terminal, and the rules that prevent a lockout are enforced by the server whatever the interface offered. Refusals come back with a reason a person can act on, not a generic error.

The guard joins the access module: no self-change, no granting above your own rank, no acting on someone at or above your rank, and the last owner cannot be demoted. Whether the target is the last owner is decided at the call site and handed to the guard, so the decision logic never reaches for the database. The role cell becomes a select for admins and above and stays inert below that.

**Blocked by:** The console opens to a member, read-only.

- [ ] The guard is unit-tested on each refusal, asserting the reason and not only the boolean
- [ ] An admin promotes a user to member from the table and the change is visible immediately
- [ ] An admin cannot demote an owner or another admin, and cannot change their own role
- [ ] Only an owner can grant owner
- [ ] Demoting the last owner is refused with a clear message rather than a constraint error
- [ ] A crafted request that the UI would not have offered is refused with the same rules
- [ ] Docs describe who may change whom

## Sign-up is gated by allowlist rules

**What to build:** with at least one rule present, only matching people can create an account, across email, GitHub and Google alike. With no rules, anyone can, so enabling the feature is never an outage. Existing accounts are untouched no matter what the rules say.

Rule parsing and admission join the access module. The rule table lands with its migration, storing a normalized value, its kind, when it was added and by whom. Enforcement is a single hook on user creation, which is the one place every sign-up path passes through, refusing with a message the client can show. The feature flag makes the whole thing a no-op when off. Rules are seeded directly in the database at this stage; the surface to manage them is the next ticket.

**Blocked by:** The console opens to a member, read-only.

- [ ] Parsing and admission are unit-tested: an empty rule set admits everyone, an exact address matches, a domain matches, a subdomain does not, and case is ignored on both sides
- [ ] A domain rule admits a matching sign-up and refuses a non-matching one on all three sign-in methods
- [ ] The refusal reaches the user as a readable message rather than a generic failure
- [ ] An existing account whose address matches no rule can still sign in
- [ ] With the flag off, the routes 404 and the hook does nothing
- [ ] Docs describe the matching semantics, including the subdomain and plus-addressing cases

## The allowlist is managed in the console

**What to build:** the Access section appears in the console with an Allowlist page, and rules are added and removed there instead of in the database. An admin adds a rule and sees, in words, who it will admit; a member sees the same list and cannot change it.

The list, create and delete endpoints sit at their respective rungs under the existing admin router, so the envelope and the gate come for free, and the list returns the shape the data table already consumes. The page is a data-table consumer with search and a kind facet. Adding is a dialog with one field that infers the kind and previews the consequence. Deleting is behind a confirm. The empty state says plainly that anyone can join.

**Blocked by:** The console opens to a member, read-only. Sign-up is gated by allowlist rules.

- [ ] An admin adds a domain rule in the UI and the next non-matching sign-up is refused
- [ ] Deleting the last rule reopens sign-up, and the empty state says so
- [ ] A duplicate rule is refused with a message, not a constraint error
- [ ] A member sees the rules and has no add button, no row actions, and no way to submit a change
- [ ] Search and the kind facet narrow the list, and the table renders at a narrow viewport
- [ ] With the feature flag off, the nav drops the page and the routes 404
- [ ] The docs page for the allowlist lands, and the design skill records anything new the data table gained
