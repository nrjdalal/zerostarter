"use client"

import { isProduction } from "@packages/env"
import { env } from "@packages/env/web-next"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { useState } from "react"

import { DevTools } from "@/components/common/devtools"
import { Toaster } from "@/components/ui/toast"

export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
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
      <Toaster />
    </NextThemesProvider>
  )
}
