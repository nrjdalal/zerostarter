"use client"

import { isProduction } from "@packages/env"
import { env } from "@packages/env/web-next"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "sonner"

import { DevTools } from "@/components/devtools"

// No component reads PostHog via @posthog/react hooks, so there is no PostHogProvider here: that would statically import posthog-js into the root client bundle. Capture runs off the global singleton that instrumentation-client.ts inits on idle.
export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {!isProduction(env.NEXT_PUBLIC_NODE_ENV) && <DevTools />}
    </QueryClientProvider>
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
