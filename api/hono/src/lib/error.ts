import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { Context } from "hono"
import type { ResponsesWithResolver } from "hono-openapi"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"

// Relative like batch.ts: the web tests type-check this file through a relative import, under a tsconfig whose @/ is web/next/src.
import type { ErrorCode } from "./error-schema"

export { ERROR_CODES, errorComponents, errorEnvelope, type ErrorCode } from "./error-schema"

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

// One OpenAPI error response, with its own code/message example.
const errorResponse = (code: string, message: string) => ({
  description: message,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
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
export const conflictErrorResponses: ResponsesWithResolver = {
  409: errorResponse("CONFLICT", "The value already exists"),
}
// Add to routes behind the console gate, the only thing that returns 403.
export const forbiddenErrorResponses: ResponsesWithResolver = {
  403: errorResponse("FORBIDDEN", "Forbidden"),
}
export const notFoundErrorResponses: ResponsesWithResolver = {
  404: errorResponse("NOT_FOUND", "Not found"),
}
// Add to routes with a request validator, the only thing that returns 400; the 400 also carries the per-field issues.
export const validationErrorResponses: ResponsesWithResolver = {
  400: {
    description: "Invalid request payload",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ValidationError" },
        example: {
          error: {
            code: "VALIDATION_ERROR",
            issues: [{ message: "Invalid email address", path: ["email"] }],
            message: "Invalid request payload",
          },
        },
      },
    },
  },
}
