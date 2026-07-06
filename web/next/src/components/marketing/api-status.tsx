"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const FRAME_DEADLINE_MS = 4000
// Rolling watchdog for a half-open socket; must exceed the server's 5s heartbeat so a real gap trips it.
const HEARTBEAT_TIMEOUT_MS = 12000
const RETRY_DELAY_MS = 3000
const RETRY_LIMIT = 3

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
  // wsHealth is the last health seen on the socket; wsConnected is whether a frame is currently streaming (the pulse); useRest is the fallback poll when the socket can't hold.
  const [wsHealth, setWsHealth] = useState<boolean | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [useRest, setUseRest] = useState(false)

  const rest = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { data, error } = await unwrap(apiClient.health.$get())
      if (error) throw new Error(error.message)
      return data
    },
    enabled: useRest,
    refetchInterval: 30000,
  })

  useEffect(() => {
    let socket: WebSocket | null = null
    let deadline: ReturnType<typeof setTimeout> | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let retries = 0
    let wasLive = false
    let stopped = false

    const clearTimers = () => {
      if (deadline) clearTimeout(deadline)
      if (retry) clearTimeout(retry)
      deadline = null
      retry = null
    }

    const connect = () => {
      if (stopped) return
      socket = apiClient.health.ws.$ws()
      socket.addEventListener("message", (event) => {
        if (stopped) return
        wasLive = true
        retries = 0
        setUseRest(false)
        setWsConnected(true)
        setWsHealth(isOperational(event.data))
        // Re-arm the watchdog each frame: a heartbeat gap on a half-open socket must trip onDrop.
        if (deadline) clearTimeout(deadline)
        deadline = setTimeout(onDrop, HEARTBEAT_TIMEOUT_MS)
      })
      socket.addEventListener("close", onDrop)
      socket.addEventListener("error", onDrop)
      // A socket can open yet never deliver a frame; treat 4s of silence as a drop.
      deadline = setTimeout(onDrop, FRAME_DEADLINE_MS)
    }

    const onDrop = () => {
      if (stopped || socket === null) return
      socket.close()
      socket = null
      clearTimers()
      // No live socket: drop the pulse but keep the last-known health showing until a retry or REST resolves it.
      setWsConnected(false)
      // Retry only a connection that had gone live (a transient blip); one that never delivered a frame commits to REST.
      if (wasLive && retries < RETRY_LIMIT) {
        retries += 1
        retry = setTimeout(connect, RETRY_DELAY_MS)
      } else {
        setUseRest(true)
      }
    }

    // Re-probe only when settled on REST (no live socket and no pending retry): reset the budget so a genuinely-reachable socket recovers, while bailing mid-burst keeps a flapping socket falling through to REST.
    const onVisible = () => {
      if (stopped || socket !== null || retry !== null || document.visibilityState !== "visible")
        return
      retries = 0
      connect()
    }

    connect()
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      stopped = true
      clearTimers()
      if (socket) socket.close()
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  let status: "connecting" | "operational" | "down"
  let live = false
  if (useRest) {
    status = rest.isError ? "down" : rest.data ? "operational" : "connecting"
  } else if (wsConnected && wsHealth !== null) {
    status = wsHealth ? "operational" : "down"
    live = wsHealth
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
