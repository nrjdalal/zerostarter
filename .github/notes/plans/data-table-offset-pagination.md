# Data table: offset pagination under infinite scroll

- Status: icebox
- Links: PR #754 review; costed again in PR #768

`GET /api/v1/admin/users` pages by `page`/`perPage` (`LIMIT`/`OFFSET`) and the table appends each batch as the reader scrolls. Rows inserted or deleted above the current window between batches shift the offset, so a row can be skipped or arrive twice.

A repeat is not only cosmetic here. `useDataTable` is given `getRowId: (row) => row.id`, so two copies of a row put a duplicate id in one row model: duplicate React keys, and selection that aliases between the two entries. The `asc(user.id)` tiebreaker keeps the ordering deterministic within a query but does nothing about the offset moving underneath it.

Keyset (cursor) pagination is the standard remedy, and it is not a local change: the endpoint's contract, the URL state (which today carries no page cursor by design), and the `getNextPageParam` seam all move with it, and the same seam is meant to serve every future table.

Open question: is drift on an admin list worth a contract change at starter scale, or does it wait for the first table where rows actually churn during a read (a feed, a job queue)? Unmeasured either way; nobody has seen it happen here.

## What PR #768 established, without changing the decision

Offset stays. The list contract gained `page`, `perPage`, `total` and `hasNextPage`, so the end signal comes from the server rather than being inferred from a total that can move. That removes the stale-total guard in `getNextPageParam`, but not the skipping: a row shifting between requests is the offset itself, not the signal.

Three things worth not re-deriving when this thaws:

- **The ordering is already keyset-ready.** All three lists carry a unique tiebreaker (`asc(user.id)`, `asc(activity.id)`, `asc(allowlist.id)`), so the sort is a total order. That is usually the blocker, and it is absent here.
- **Cursor and offset can coexist on one route**, contrary to how it is usually framed: accept either `?page=` or `?cursor=`, answer with both `hasNextPage` and `nextCursor`. Infinite scroll follows the cursor and stops skipping; jump-to-page and the count keep working off the offset. It needs two rules to stay coherent: one mode per query key, and the cursor is invalidated by any change to sort, filter or search.
- **The cost is the null ordering, not the cursor.** `activity` sorts by `created_at` (not null) plus id, so its predicate is one comparison. `users` and `allowlist` sort with `nulls last` over nullable expressions (`max(session.updated_at)`, a `coalesce`), so each sortable column needs a branch for whether the cursor sits in the null region, times two for direction.

So the cheapest first move, if this thaws, is Activity alone: append-only, non-null sort, and the table most likely to outgrow offset.

The response shape chosen in #768 is additive on purpose: `nextCursor` can join those fields and `hasNextPage` retire, without reshaping anything.
