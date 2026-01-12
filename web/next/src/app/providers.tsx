"use client"

import { isProduction } from "@packages/env"
import { env } from "@packages/env/web-next"
import { PostHogProvider } from "@posthog/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import posthog from "posthog-js"
import { useState } from "react"
import { Toaster } from "sonner"

import { DevTools } from "@/components/devtools"

export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        {children}
        {!isProduction(env.NEXT_PUBLIC_NODE_ENV) && <DevTools />}
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
