import { env } from "@packages/env/web-next"

// Defer PostHog off the critical path: dynamically import and init the library on idle so its ~325KB is code-split out of the first-load bundle and does not compete with hydration. It still captures the initial pageview once it inits.
if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY
  const load = () =>
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        defaults: "2025-11-30",
      })
    })
  if ("requestIdleCallback" in window) window.requestIdleCallback(load)
  else setTimeout(load, 1)
}
