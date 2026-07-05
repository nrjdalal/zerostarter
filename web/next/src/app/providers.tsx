import { env } from "@packages/env/web-next"
import { PostHogProvider } from "@posthog/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import posthog from "posthog-js"
import { useState } from "react"
import { Toaster } from "sonner"

import { DevTools } from "@/components/devtools"

// Replaces web/next's instrumentation-client.ts: Vite has no instrumentation hook, so PostHog initializes with this client-only module.
if (typeof window !== "undefined" && env.VITE_POSTHOG_KEY) {
  posthog.init(env.VITE_POSTHOG_KEY, {
    api_host: env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
    defaults: "2025-11-30",
  })
}

export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        {children}
        {import.meta.env.DEV && <DevTools />}
      </QueryClientProvider>
    </PostHogProvider>
  )
}

export function InnerProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors />
    </NextThemesProvider>
  )
}
