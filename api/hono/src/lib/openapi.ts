import { env } from "@packages/env/api-hono"
import { resolver } from "hono-openapi"
import { z } from "zod"

interface ErrorResponse {
  description: string
  content: {
    "application/json": {
      example: {
        error: {
          code: string
          message: string
        }
      }
      schema: any
    }
  }
}

interface OpenApiComponents {
  responses: {
    InternalServerError: ErrorResponse
    TooManyRequestsError: ErrorResponse
    UnauthorizedError: ErrorResponse
  }
  securitySchemes: {
    sessionCookie: {
      description: string
      in: "cookie"
      name: string
      type: "apiKey"
    }
  }
}

function getSessionCookieName(url: string) {
  const { protocol, hostname } = new URL(url)
  const parts = hostname.split(".")
  const isIpAddress = parts.every((part) => /^\d+$/.test(part))
  const cookiePrefix = !isIpAddress && parts.length >= 4 ? parts[1] : "better-auth"
  const securePrefix = protocol === "https:" ? "__Secure-" : ""

  return `${securePrefix}${cookiePrefix}.session_token`
}

const errorSchema = z.object({
  error: z.object({
    code: z.string().meta({ example: "INTERNAL_SERVER_ERROR" }),
    message: z.string().meta({ example: "Internal Server Error" }),
  }),
})

function createErrorResponse(description: string, code: string, message: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: resolver(errorSchema),
        example: {
          error: { code, message },
        },
      },
    },
  }
}

export const openApiComponents: OpenApiComponents = {
  responses: {
    InternalServerError: createErrorResponse(
      "Internal Server Error",
      "INTERNAL_SERVER_ERROR",
      "Internal Server Error",
    ),
    TooManyRequestsError: createErrorResponse(
      "Too Many Requests",
      "TOO_MANY_REQUESTS",
      "Too Many Requests",
    ),
    UnauthorizedError: createErrorResponse("Unauthorized", "UNAUTHORIZED", "Unauthorized"),
  },
  securitySchemes: {
    sessionCookie: {
      type: "apiKey" as const,
      in: "cookie" as const,
      name: getSessionCookieName(env.HONO_APP_URL),
      description:
        "Better Auth session cookie required for protected API routes. Scalar works best when you already have an active browser session.",
    },
  },
}

export const commonErrorResponses = {
  429: { $ref: "#/components/responses/TooManyRequestsError" },
  500: { $ref: "#/components/responses/InternalServerError" },
}

export const protectedErrorResponses = {
  401: { $ref: "#/components/responses/UnauthorizedError" },
  ...commonErrorResponses,
}

export const protectedRouteSecurity = [{ sessionCookie: [] as string[] }]
