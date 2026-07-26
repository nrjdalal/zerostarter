import { z } from "zod"

// A batch acts on rows the caller picked, and every guard in this API runs per target, so three changing and two refusing is the designed answer rather than a partial failure to paper over.
// That is why a batch keeps the ordinary envelope instead of reaching for 207. The request either was not allowed at all, which is the usual { error } from the gate, or it ran and every row carries its own outcome inside { data }. 207 is still 2xx, so unwrap() on the web would treat it identically to 200 while the error map, the response sets and the docs all gained a status nothing else uses.
export const MAX_BATCH = 100

// Capped like perPage: without a bound, one request could hold a transaction open over the whole table.
export const batchInput = <T extends z.ZodRawShape>(shape: T) =>
  z.object({
    ids: z.array(z.string().trim().min(1)).min(1).max(MAX_BATCH),
    ...shape,
  })

// The codes a per-row refusal can carry. Narrower than ErrorCode on purpose: a row can be refused, missing, or raced, and anything else is a whole-request failure the envelope already covers.
export const BATCH_REFUSAL_CODES = ["CONFLICT", "FORBIDDEN", "NOT_FOUND"] as const

export type BatchRefusalCode = (typeof BATCH_REFUSAL_CODES)[number]

export type BatchOutcome = { id: string } & (
  | { ok: true }
  | { code: BatchRefusalCode; message: string; ok: false }
)

export const batchOutcomeSchema = z.discriminatedUnion("ok", [
  z.object({ id: z.string(), ok: z.literal(true) }),
  z.object({
    code: z.enum(BATCH_REFUSAL_CODES),
    id: z.string(),
    message: z.string(),
    ok: z.literal(false),
  }),
])

export const batchResponseSchema = z.object({
  data: z.object({ results: z.array(batchOutcomeSchema) }),
})

// The ids to act on, in the order asked and without repeats, so a result lines up with the request and a duplicated id cannot be acted on twice.
export const uniqueIds = (ids: string[]) => [...new Set(ids)]

export const refused = (id: string, code: BatchRefusalCode, message: string): BatchOutcome => ({
  code,
  id,
  message,
  ok: false,
})
