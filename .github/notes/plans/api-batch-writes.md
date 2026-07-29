# Batch the console's bulk writes into one request per action

- Status: backlog
- Links: #759; PR #758 review

The console's bulk actions (Set role, Ban, Unban, Remove rules) issue one request per selected row, fanned out five at a time by `web/next/src/lib/api/bulk.ts`. That was the honest simplification for #758, where the endpoints already existed per resource. It should not stay one.

Authenticated callers get `HONO_RATE_LIMIT * 2`, 120 requests a minute by default. A hundred-row ban spends most of that on one click, and a second bulk action inside the same minute starts 429ing partway; those are reported as failures rather than refusals, so the surface stays honest, but the action half-works. Every one of those requests also re-reads the session past the cookie cache, which is the console gate's deliberate freshness trade paid N times for one intent.

The sharpest argument is that the fan-out buys nothing where it costs most. A role change takes `FOR UPDATE` on the owner rows, so a batch of them serializes at the database whatever the client does; the concurrency cap just multiplies session reads and rate-limit units against a queue of one. And because each row is its own request, a batch is not atomic against another admin's batch, where a single transaction would be.

## Shape

```
PATCH  /api/v1/admin/users/role     { ids: string[], role }
PATCH  /api/v1/admin/users/status   { ids: string[], banned }
DELETE /api/v1/admin/allowlist      { ids: string[] }
```

Ids move into the body here and only here, because these address a set rather than a resource; `/users/:id/role`, `/users/:id/status` and `/allowlist/:id` keep the path parameter that identifies what is being changed. `ids` needs a length cap the way `perPage` has one, so a request cannot hold a transaction open over ten thousand rows.

## What it actually turns on

Partial refusal is by design: the rank guard runs per target, so a batch can legitimately change three accounts and refuse two. A batch therefore cannot answer with one `{ data }` or one `{ error }`. It needs a per-id outcome, which is the 207 Multi-Status shape and the one place this API's uniform envelope does not stretch.

That makes this a contract change rather than a refactor, and the reason it is not folded into #758. What a partial success looks like has to be decided and written into `manage/api-conventions`, the `api-endpoint` skill and the envelope typing in `api/hono/src/lib/error.ts` before any route moves.

## Client

`runBulk` shrinks to one call plus a fold, and the concurrency cap goes with the fan-out. `describeBulk`, `bulkSucceeded` and `toastBulk` are untouched, since they already work off counts; the unit tests move with `runBulk`.
