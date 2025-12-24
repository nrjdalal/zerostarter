"use client"

import { useState } from "react"
import Script from "next/script"

import { env } from "@packages/env/web-next"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "sonner"

import { config } from "@/lib/config"
import { DevTools } from "@/components/devtools"

export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {config.env.isDevelopment && <DevTools />}
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
      {process.env.NODE_ENV !== "development" && env.NEXT_PUBLIC_USERJOT_ID && (
        <>
          <Script
            id="userjot-sdk"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));`,
            }}
          />
          <Script
            id="userjot-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.uj.init('${env.NEXT_PUBLIC_USERJOT_ID}', { widget: true, position: 'right', theme: 'auto' });`,
            }}
          />
        </>
      )}
    </NextThemesProvider>
  )
}
