# Console Access: the role ladder and the allowlist

- Status: planned
- Links: PR #754 (the data table this builds on); Better Auth [admin plugin](https://www.better-auth.com/docs/plugins/admin)

One console section, `Access`, holding two related things: who may reach the console and what they may do there (a platform role ladder), and who may create an account at all (an allowlist of domains and addresses). They ship together because the allowlist's own permissions are defined by the ladder.

## Decisions taken

- The platform ladder is `owner > admin > member > user`, reusing the organization plugin's words on purpose. `user.role` and `member.role` are different systems with overlapping values, so every label that shows one says which it is.
- `member` gets a **read-only** console: it sees every console surface and mutates nothing.
- The page is **Access > Allowlist**, not "Allowed Emails": it holds domains as well as addresses.
- Both land in one change, since the allowlist's read and write gates are rungs of the ladder.

## The ladder

`user.role` already exists (Better Auth admin plugin, `text` defaulting to `user`). It stays a single column; what changes is that it holds four values and that gates compare rank instead of equality.

| Role     | Console | Writes                           | Role changes               |
| -------- | ------- | -------------------------------- | -------------------------- |
| `owner`  | yes     | everything                       | any role, including owners |
| `admin`  | yes     | everything except granting owner | up to `member`             |
| `member` | yes     | none, every mutation is denied   | none                       |
| `user`   | no      | n/a                              | n/a                        |

- One rank map is the source of truth (`owner: 3, admin: 2, member: 1, user: 0`), and both gates ask "at least X" against it. A null or unknown role reads as `user`, so an unrecognized value can never grant access.
- `web/next/src/lib/auth/console.ts` gates the pages at `>= member`; `api/hono/src/middlewares/admin.ts` becomes rank-parameterized (`>= member` to read, `>= admin` to write), keeping its uncached read and its `banned` check.
- The plugin gets `adminRoles: ["owner", "admin"]` so its own privileged endpoints (ban, impersonate, set-role) refuse `member` without us reimplementing them, and `defaultRole` stays `user`.

### Guards

These are the parts that lock people out if they are wrong, so they are stated as rules, not intentions:

- Nobody changes their own role. Demoting yourself out of the console is the most likely accident.
- Nobody grants a role above their own rank, and nobody changes a user at or above their own rank. An admin cannot demote an owner or another admin.
- The last `owner` cannot be demoted or deleted; the API refuses with a clear message rather than a constraint error.
- Existing rows hold `admin` or `user` (or null). The migration leaves them as they are: today's admins keep their powers, and exactly one account is promoted to `owner` by hand through the script, which is also the bootstrap for a fresh install.

## Allowlist

A rule is a domain (`@example.com`) or a full address (`ada@example.com`). Rules decide **who may create an account**; they never evict an existing one, because offboarding is a role change or a ban, not a list edit.

- Table `allowlist`: `id`, `value` (lowercased, unique), `kind` (`domain` | `email`), `createdAt`, `createdBy` (user id, nullable so a seeded rule has no author).
- `kind` is stored rather than derived, so the facet filter and the API do not re-parse on every read. It is set from the input shape: a leading `@` is a domain, anything else must parse as an address.
- Matching is case-insensitive on the whole value. A domain rule matches on the part after the `@`, exactly: `@example.com` does not admit `@mail.example.com`, which needs its own rule. Plus-addressing is not stripped, so `ada+test@example.com` is admitted by the domain rule but not by an address rule for `ada@example.com`.
- Enforcement is one `databaseHooks.user.create.before` hook in `packages/auth/src/index.ts`, which covers email/password, GitHub, and Google in a single place because every path creates a user.
- **An empty list admits everyone.** The alternative (empty means nobody) turns enabling the feature into an outage, so the list starts open and the UI says so plainly on the empty state. The feature flag is the on/off; the rules narrow it.
- A rule is never required to admit an existing account, and the hook only runs on creation, so no edit can strand a signed-in user.
- `features.allowlist` in `packages/config/src/site.ts` gates the surface the way `waitlist` does: off means the routes 404 and the nav drops the page, and the hook is a no-op.

## Surfaces

`Access` is a new console sidebar group, below `Platform`. Both pages are data-table consumers, which makes this the module's second and third consumers.

- **Access > Allowlist** (`(console)/console/(access)/allowlist/`): columns are rule, kind, added by, added, actions. Toolbar carries search and a kind facet. Adding is a dialog with one field that infers `kind` from the input and previews it ("Anyone at example.com" / "Only ada@example.com"). Deleting is a row action behind a confirm.
- **Roles** live on the existing Users table rather than a new page: the role cell becomes a select for `>= admin`, disabled for `member`, and the rank guards above are enforced server-side regardless of what the UI offers.
- For a `member`, every table renders as it does today with its mutating affordances absent, not merely disabled: no add button, no row actions, no role select.

### The word "role" in the UI

The Users table's column is headed **Role** today and shows the platform role. Once organizations grow their own visible surface, that header has to say which system it means. This plan proposes the console keeps `Role` (the console only ever shows platform roles) and any organization surface says `Organization role`. That is a call worth making deliberately when the second surface lands rather than renaming twice.

## API

Under the existing admin router, so the gate and the envelope come for free.

- `GET /api/v1/admin/allowlist` (`>= member`): the same list shape the users route returns, so the data table's `fetchPage` contract is unchanged.
- `POST /api/v1/admin/allowlist` (`>= admin`): validates the value, normalizes it, derives `kind`, 409s a duplicate.
- `DELETE /api/v1/admin/allowlist/:id` (`>= admin`).
- `PATCH /api/v1/admin/users/:id/role` (`>= admin`): applies the rank guards and refuses the last-owner demotion.

Validation lives in the router with the rest, per the standing decision not to split a schema per file; the caps and the enum stay a `satisfies`-checked whitelist.

## Traps

1. Two role systems now share three words. Every message, label, and doc sentence must say which one it means, or a reader will assume org roles gate the console.
2. `adminRoles` is the plugin's own gate, not ours. Setting it does not gate our routes, and gating our routes does not stop the plugin's endpoints. Both are needed.
3. The rank map has to be the only place ordering is expressed. A second comparison written inline is how `member` quietly acquires write access.
4. The create hook runs inside Better Auth's transaction; throwing the plugin's `APIError` surfaces a clean message, while returning `false` fails opaquely.
5. An allowlist rule added while a sign-up is in flight does not retroactively admit or reject it, and that is fine, but the empty-state copy must not promise otherwise.

## Open

- Whether `member` should see the Users table at all, given it exposes every account's email. Read-only was chosen for the console as a whole; this one surface may deserve `>= admin`.
- Whether removing a rule should offer to review accounts that no longer match, which is the natural next question a reader asks and the natural start of an offboarding flow.
- Whether the waitlist and the allowlist eventually become one surface: one collects people who want in, the other decides who gets in, and running both is a plausible source of confusion.

## Build order

1. The ladder: rank map, both gates, `adminRoles`, the `console:roles` script vocabulary, and the owner bootstrap.
2. `PATCH .../role` with the guards, and the Users table's role select.
3. The allowlist table and migration, the create hook, and the feature flag.
4. The allowlist API and its console page.
5. Docs (`manage/authentication` for the ladder, a new page or section for the allowlist, `manage/api-conventions` for the rank-parameterized middleware) and the `design`, `api-endpoint`, and `codebase-map` skills, in the same change.
