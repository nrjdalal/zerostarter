import { httpInstrumentationMiddleware } from "@hono/otel"

/*
 * HTTP instrumentation middleware for Hono
 *
 * This middleware creates spans for HTTP requests. The OpenTelemetry SDK
 * is initialized separately in @/instrumentation.ts which must be imported
 * first in the application entry point.
 */
export const otelMiddleware = httpInstrumentationMiddleware({
  serviceName: "api-hono",
  serviceVersion: "0.0.1",
  captureRequestHeaders: ["x-request-id", "user-agent"],
  captureResponseHeaders: ["x-request-id", "content-type"],
})
