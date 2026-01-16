import { httpInstrumentationMiddleware } from "@hono/otel"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import { env } from "@packages/env/api-hono"

/*
 * OpenTelemetry SDK configuration for Hono API
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

const openTelemetrySDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "api-hono",
    [ATTR_SERVICE_VERSION]: "0.0.1",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessors: env.OTEL_LOG_TO_CONSOLE
    ? [new SimpleSpanProcessor(new ConsoleSpanExporter())]
    : undefined,
})

openTelemetrySDK.start()

export const otelMiddleware = httpInstrumentationMiddleware({
  serviceName: "api-hono",
  serviceVersion: "0.0.1",
  captureRequestHeaders: ["x-request-id", "user-agent"],
  captureResponseHeaders: ["x-request-id", "content-type"],
})
