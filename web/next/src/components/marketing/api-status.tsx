"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const HEARTBEAT_TIMEOUT_MS = 12000
const RECONNECT_BASE_MS = 3000
const RECONNECT_MAX_MS = 30000

// Frames aren't RPC-typed (Hono types the route, not the payload), so read the one field we need defensively.
function isOperational(raw: unknown): boolean {
  if (typeof raw !== "string") return false
  try {
    const frame = JSON.parse(raw) as { message?: unknown }
    return frame.message === "ok"
  } catch {
    return false
  }
}

export function ApiStatus() {
  // REST is the always-honest baseline (polled whenever no frame is live); the socket only overlays a live pulse and faster updates. wsFrame is the latest frame's health, or null when nothing is currently streaming.
  const [wsFrame, setWsFrame] = useState<boolean | null>(null)

  const rest = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { data, error } = await unwrap(apiClient.health.$get())
      if (error) throw new Error(error.message)
      return data
    },
    enabled: wsFrame === null,
    refetchInterval: 30000,
  })

  useEffect(() => {
    let socket: WebSocket | null = null
    let watchdog: ReturnType<typeof setTimeout> | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let backoff = 0
    let stopped = false

    const connect = () => {
      if (stopped) return
      const ws = apiClient.health.ws.$ws()
      socket = ws
      // Ignore events from a socket that has already been superseded, so a late close can't tear down a newer one.
      const current = () => !stopped && socket === ws
      const drop = () => {
        if (!current()) return
        // Close it ourselves: on the watchdog path the socket is still OPEN, and closing lets the server's onClose clear its heartbeat instead of streaming to a dead peer (a no-op once close/error already fired).
        ws.close()
        socket = null
        setWsFrame(null)
        if (watchdog) clearTimeout(watchdog)
        watchdog = null
        // Capped backoff: a blip reconnects fast, a dead endpoint (serverless) settles into a gentle re-probe while REST carries the badge.
        reconnect = setTimeout(
          connect,
          Math.min(RECONNECT_BASE_MS * 2 ** backoff, RECONNECT_MAX_MS),
        )
        backoff += 1
      }
      ws.addEventListener("message", (event) => {
        if (!current()) return
        backoff = 0
        setWsFrame(isOperational(event.data))
        // Half-open guard: if heartbeats stop while the socket stays open, treat the gap as a drop.
        if (watchdog) clearTimeout(watchdog)
        watchdog = setTimeout(drop, HEARTBEAT_TIMEOUT_MS)
      })
      ws.addEventListener("close", drop)
      ws.addEventListener("error", drop)
    }

    // A backgrounded tab often drops the socket; reconnect immediately (and reset backoff) when it returns.
    const onVisible = () => {
      if (stopped || socket !== null || document.visibilityState !== "visible") return
      if (reconnect) clearTimeout(reconnect)
      reconnect = null
      backoff = 0
      connect()
    }

    connect()
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      stopped = true
      if (watchdog) clearTimeout(watchdog)
      if (reconnect) clearTimeout(reconnect)
      if (socket) socket.close()
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  let status: "connecting" | "operational" | "down"
  let live = false
  if (wsFrame !== null) {
    status = wsFrame ? "operational" : "down"
    live = wsFrame
  } else if (rest.isError) {
    status = "down"
  } else if (rest.data) {
    status = "operational"
  } else {
    status = "connecting"
  }

  if (status === "connecting") {
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

  if (status === "down") {
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
      <span className={cn("bg-success size-2 shrink-0 rounded-full", live && "animate-pulse")} />
      <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
    </Badge>
  )
}
