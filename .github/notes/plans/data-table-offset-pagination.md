# Data table: offset pagination under infinite scroll

- Status: icebox
- Links: PR #754 review

`GET /api/v1/admin/users` pages by `page`/`perPage` (`LIMIT`/`OFFSET`) and the table appends each batch as the reader scrolls. Rows inserted or deleted above the current window between batches shift the offset, so a row can be skipped or arrive twice.

A repeat is not only cosmetic here. `useDataTable` is given `getRowId: (row) => row.id`, so two copies of a row put a duplicate id in one row model: duplicate React keys, and selection that aliases between the two entries. The `asc(user.id)` tiebreaker keeps the ordering deterministic within a query but does nothing about the offset moving underneath it.

Keyset (cursor) pagination is the standard remedy, and it is not a local change: the endpoint's contract, the URL state (which today carries no page cursor by design), and the `getNextPageParam` seam all move with it, and the same seam is meant to serve every future table.

Open question: is drift on an admin list worth a contract change at starter scale, or does it wait for the first table where rows actually churn during a read (a feed, a job queue)? Unmeasured either way; nobody has seen it happen here.
