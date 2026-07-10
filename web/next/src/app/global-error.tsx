"use client"

import { RouteError } from "@/components/common/route-error"

import "@/app/globals.css"

export default function GlobalError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col">
        <RouteError {...props} className="flex-1" />
      </body>
    </html>
  )
}
