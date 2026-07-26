import { MAX_BATCH } from "@packages/config/console"
import { z } from "zod"

import type { ErrorCode } from "./error"

// A batch acts on rows the caller picked, and every guard in this API runs per target, so three changing and two refusing is the designed answer rather than a partial failure to paper over.
// That is why a batch keeps the ordinary envelope instead of reaching for 207. The request either was not allowed at all, which is the usual { error } from the gate, or it ran and every row carries its own outcome inside { data }. 207 is still 2xx, so unwrap() on the web would treat it identically to 200 while the error map, the response sets and the docs all gained a status nothing else uses.

// Capped like perPage: without a bound, one request could hold a transaction open over the whole table. The client splits a bigger selection rather than meeting this as a rejection.
export const batchInput = <T extends z.ZodRawShape>(shape: T) =>
  z.object({
    ids: z.array(z.string().trim().min(1)).min(1).max(MAX_BATCH),
    ...shape,
  })

// The codes a per-row refusal can carry. Narrower than ErrorCode on purpose: a row can be refused, missing, or raced, and anything else is a whole-request failure the envelope already covers.
// Checked against ErrorCode rather than written beside it, so this cannot drift into a second vocabulary of codes the rest of the API does not know.
export const BATCH_REFUSAL_CODES = [
  "CONFLICT",
  "FORBIDDEN",
  "NOT_FOUND",
] as const satisfies readonly ErrorCode[]

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

// A row that changed under the request. Said the same way everywhere, because a reader meeting it in two tables should not have to wonder whether the two mean different things.
export const raced = (id: string) =>
  refused(id, "CONFLICT", "This account changed while you were acting on it. Try again.")

// The answer a set route assembles: the order the caller asked for, with a raced row standing in for anything a branch forgot to record, so a missing outcome cannot reach the reader as null.
export const answerFor = (targets: string[], outcomes: Map<string, BatchOutcome>) =>
  targets.map((id) => outcomes.get(id) ?? raced(id))

// What a set route answers with, as the client receives it after unwrap.
export type BatchAnswer = {
  data: { results: BatchOutcome[] } | null
  error: { code: string; message: string } | null
}
