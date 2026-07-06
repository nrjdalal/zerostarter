"use client"

import type { HealthEvent } from "@api/hono"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"

type ConnectionState = "connecting" | "live" | "down"

function parseHealthEvent(raw: unknown): HealthEvent | null {
  if (typeof raw !== "string") return null
  try {
    return JSON.parse(raw) as HealthEvent
  } catch {
    return null
  }
}

export function ApiStatus() {
  const [state, setState] = useState<ConnectionState>("connecting")

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const connect = () => {
      socket = apiClient.health.ws.$ws()
      socket.addEventListener("message", (event) => {
        const health = parseHealthEvent(event.data)
        setState(health && health.message === "ok" ? "live" : "down")
      })
      socket.addEventListener("close", () => {
        if (stopped) return
        setState("down")
        reconnect = setTimeout(connect, 3000)
      })
      socket.addEventListener("error", () => {
        if (socket) socket.close()
      })
    }

    connect()

    return () => {
      stopped = true
      if (reconnect) clearTimeout(reconnect)
      if (socket) socket.close()
    }
  }, [])

  if (state === "connecting") {
    return (
      <Badge
        variant="outline"
        role="status"
        aria-label="API status"
        className="invisible h-8 gap-2 rounded-full border px-4 py-1.5 text-sm"
      >
        <span className="size-2 shrink-0 rounded-full" />
        <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
      </Badge>
    )
  }

  if (state === "down") {
    return (
      <Badge
        variant="destructive"
        role="status"
        aria-label="API status"
        className="border-destructive/20 animate-in fade-in h-8 gap-2 rounded-full border px-4 py-1.5 text-sm duration-2000"
      >
        <span className="bg-destructive size-2 shrink-0 rounded-full" />
        <span className="min-w-48 text-center whitespace-nowrap">Systems are facing issues</span>
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label="API status"
      className="border-success/20 bg-success/10 text-success animate-in fade-in h-8 gap-2 rounded-full border px-4 py-1.5 text-sm duration-2000"
    >
      <span className="bg-success size-2 shrink-0 animate-pulse rounded-full" />
      <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
    </Badge>
  )
}
