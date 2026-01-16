import type { SpanProcessor } from "@opentelemetry/sdk-trace-node"

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"

/*
 * OpenTelemetry SDK initialization - MUST be imported before any other modules
 *
 * This file initializes the NodeSDK for auto-instrumentation. It must be the
 * very first import in the application entry point (index.ts) to ensure all
 * libraries are properly instrumented before they are loaded.
 *
 * Standard OTEL environment variables are automatically picked up:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP collector endpoint (e.g., http://localhost:4318)
 * - OTEL_EXPORTER_OTLP_HEADERS: Headers for authentication (e.g., x-honeycomb-team=<api-key>)
 * - OTEL_SERVICE_NAME: Service name (overrides default "api-hono")
 * - OTEL_RESOURCE_ATTRIBUTES: Additional resource attributes (e.g., service.version=1.0.0)
 *
 * Custom environment variables:
 * - OTEL_LOG_TO_CONSOLE: Set to "true" to log traces to console (default: false)
 */

const spanProcessors: SpanProcessor[] = [new BatchSpanProcessor(new OTLPTraceExporter())]

if (process.env.OTEL_LOG_TO_CONSOLE === "true") {
  spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()))
}

const openTelemetrySDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "api-hono",
    [ATTR_SERVICE_VERSION]: "0.0.1",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessors,
})

const SHUTDOWN_TIMEOUT_MS = 5000

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[OpenTelemetry] Received ${signal}, shutting down...`)
  try {
    await Promise.race([
      openTelemetrySDK.shutdown(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Shutdown timeout")), SHUTDOWN_TIMEOUT_MS),
      ),
    ])
    console.log("[OpenTelemetry] Shutdown complete")
  } catch (error) {
    console.error("[OpenTelemetry] Shutdown error:", error)
  }
}

process.on("SIGINT", async () => {
  await gracefulShutdown("SIGINT")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await gracefulShutdown("SIGTERM")
  process.exit(0)
})

process.on("uncaughtException", async (error) => {
  console.error("[OpenTelemetry] Uncaught exception:", error)
  await gracefulShutdown("uncaughtException")
  process.exit(1)
})

try {
  openTelemetrySDK.start()
} catch (error) {
  console.error("[OpenTelemetry] Failed to start SDK:", error)
  process.exit(1)
}
