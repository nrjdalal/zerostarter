import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { Context } from "hono"
import { resolver, type ResponsesWithResolver } from "hono-openapi"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"

// Every code the API can put in the { error } envelope. Single source of truth: the TS union, the OpenAPI schema, and the web client all derive from this list. "ERROR" is the catch-all for an HTTPException whose status isn't mapped below.
export const ERROR_CODES = [
  "AGENT_LOGIN_FAILED",
  "BAD_REQUEST",
  "ERROR",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export function jsonError<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  return c.json({ error: { ...extra, code, message } }, status)
}

// Throw this anywhere and onError shapes the { error } envelope. Extends HTTPException so Hono treats it as a known error; carries our envelope's domain code and any extras (e.g. validation issues).
export class ApiError extends HTTPException {
  readonly code: ErrorCode
  readonly extra?: Record<string, unknown>
  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super(status, { message })
    this.code = code
    this.extra = extra
  }
}

// Code for an HTTPException, by status; Hono throws these for client errors (e.g. 400 on malformed JSON).
const httpExceptionCodes: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
}

export const errorHandler = (err: Error, c: Context) => {
  // Our domain errors carry their own code/extra; check before HTTPException since ApiError extends it.
  if (err instanceof ApiError) {
    return jsonError(c, err.status, err.code, err.message, err.extra)
  }

  if (err instanceof z.ZodError) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request payload", { issues: err.issues })
  }

  // Honor the status Hono already chose (e.g. malformed JSON is a 400, not a 500); messages are dev-set and safe to surface.
  if (err instanceof HTTPException) {
    const code = httpExceptionCodes[err.status] ? httpExceptionCodes[err.status] : "ERROR"
    return jsonError(c, err.status, code, err.message)
  }

  const message = isLocal(env.NODE_ENV) ? err.message : "Internal Server Error"
  return jsonError(c, 500, "INTERNAL_SERVER_ERROR", message)
}

// Shape of the error envelope jsonError emits; reused by the OpenAPI error responses below.
export const errorEnvelope = z.object({
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
})

// Validation errors also carry the failing fields, so document that on the 400 response.
const validationErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    issues: z
      .array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() }))
      .optional(),
  }),
})

// One OpenAPI error response, with its own code/message example.
const errorResponse = (code: string, message: string) => ({
  description: message,
  content: {
    "application/json": {
      schema: resolver(errorEnvelope),
      example: { error: { code, message } },
    },
  },
})

// 429 + 500 can hit any matched route (global rate limiter + onError), so they apply everywhere.
export const globalErrorResponses: ResponsesWithResolver = {
  429: errorResponse("TOO_MANY_REQUESTS", "Too Many Requests"),
  500: errorResponse("INTERNAL_SERVER_ERROR", "Internal Server Error"),
}

// Add to routes behind authMiddleware, the only thing that returns 401.
export const authErrorResponses: ResponsesWithResolver = {
  401: errorResponse("UNAUTHORIZED", "Unauthorized"),
}

// Add to routes with a request validator, the only thing that returns 400; the 400 also carries the per-field issues.
export const validationErrorResponses: ResponsesWithResolver = {
  400: {
    description: "Invalid request payload",
    content: {
      "application/json": {
        schema: resolver(validationErrorEnvelope),
        example: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
            issues: [{ path: ["email"], message: "Invalid email address" }],
          },
        },
      },
    },
  },
}
