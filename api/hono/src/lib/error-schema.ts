import type { openAPIRouteHandler } from "hono-openapi"
import { z } from "zod"

// Every code the API can put in the { error } envelope. Single source of truth: the TS union, the OpenAPI schema, and the web client all derive from this list. "ERROR" is the catch-all for an HTTPException whose status isn't mapped below.
export const ERROR_CODES = [
  "AGENT_LOGIN_FAILED",
  "BAD_REQUEST",
  "CONFLICT",
  "ERROR",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

// Shape of the error envelope jsonError emits; reused by the OpenAPI error responses in error.ts.
export const errorEnvelope = z.object({
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
})

// Validation errors also carry the failing fields, so document that on the 400 response.
export const validationErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    issues: z
      .array(z.object({ message: z.string(), path: z.array(z.union([z.string(), z.number()])) }))
      .optional(),
    message: z.string(),
  }),
})

// The document's own component-schema type, reached through the handler so the transitive openapi-types package is never imported directly.
type SchemaComponents = NonNullable<
  NonNullable<NonNullable<Parameters<typeof openAPIRouteHandler>[1]>["documentation"]>["components"]
>["schemas"]

// The envelopes as named components, so every 4xx/5xx response points at one Error schema a client can type against instead of an inline copy per response.
export const errorComponents: NonNullable<SchemaComponents> = {
  Error: z.toJSONSchema(errorEnvelope, {
    target: "draft-2020-12",
  }) as NonNullable<SchemaComponents>[string],
  ValidationError: z.toJSONSchema(validationErrorEnvelope, {
    target: "draft-2020-12",
  }) as NonNullable<SchemaComponents>[string],
}
