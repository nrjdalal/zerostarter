# Batch the console's bulk writes into one request per action

- Status: built in PR #767
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

Ids move into the body, because these address a set rather than a resource. `ids` needs a length cap the way `perPage` has one, so a request cannot hold a transaction open over ten thousand rows.

## What shipped

The set routes replaced the per-row ones rather than joining them: `/users/:id/role`, `/users/:id/status` and `/allowlist/:id` are gone, and a single row is a set of one. Keeping both would have meant two copies of the same guard, transaction and outcome shape per action.

The envelope decision below was made in favour of per-id outcomes inside `{ data }` at 200, not 207: 207 is still `2xx`, so `unwrap` treats it exactly like 200 while every response set, the error map and the docs gain a status nothing else uses.

The cap lives in `@packages/config/console` rather than only in the route, because the console's tables load more as you scroll and select-all takes every loaded row: the client splits a selection at the cap instead of meeting it as a rejected request.

## What it turned on

Partial refusal is by design: the rank guard runs per target, so a batch can legitimately change three accounts and refuse two. A batch therefore cannot answer with one `{ data }` or one `{ error }`. It needs a per-id outcome, which is the 207 Multi-Status shape and the one place this API's uniform envelope does not stretch.

That makes this a contract change rather than a refactor, and the reason it is not folded into #758. What a partial success looks like has to be decided and written into `manage/api-conventions` and the `api-endpoint` skill before any route moves.

`lib/error.ts` was named as a third place to write it, and shipped untouched: the decision was to add no status and no error code, so the envelope is unchanged. What the codes needed instead was a link rather than an addition, and `BATCH_REFUSAL_CODES` is now `satisfies readonly ErrorCode[]`, so a refusal code that is not part of the API's vocabulary is a compile error.

## Client

`runBulk` is replaced by `runBatched`, which sends the selection in cap-sized requests and folds the per-id answers into the counts `describeBulk` and `toastBulk` already read. Its unit tests move with it.
