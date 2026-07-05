import { env } from "@packages/env/web-next"
import posthog from "posthog-js"

// PostHog's documented App Router setup: init in instrumentation-client (client-only by Next.js). The `defaults` date turns on the current sensible defaults, including SPA pageview capture (capture_pageview: 'history_change'), so no PostHogProvider or manual pageview component is needed. Guarded on the key so a fork without PostHog configured is a no-op.
if (env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    defaults: "2026-05-30",
  })
}
