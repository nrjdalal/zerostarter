"use client"

import { RouteError } from "@/components/route-error"

import "@/app/globals.css"

export default function GlobalError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <RouteError {...props} className="min-h-svh" />
      </body>
    </html>
  )
}
