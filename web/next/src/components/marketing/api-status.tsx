"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const FRAME_DEADLINE_MS = 4000
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
  // The WebSocket is the live channel (pulsing dot). A socket that was live and
  // blips gets a few quick retries; one that never connects (serverless deploy,
  // a proxy that buffers the upgrade) falls straight to polling REST /api/health,
  // so the badge always reflects real status and only the pulse is socket-only.
  const [wsLive, setWsLive] = useState<boolean | null>(null)
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
        if (deadline) {
          clearTimeout(deadline)
          deadline = null
        }
        wasLive = true
        retries = 0
        setUseRest(false)
        setWsLive(isOperational(event.data))
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
      // Retry only a connection that had gone live (a transient blip); a socket
      // that never delivered a frame commits to REST straight away.
      if (wasLive && retries < RETRY_LIMIT) {
        retries += 1
        retry = setTimeout(connect, RETRY_DELAY_MS)
      } else {
        setUseRest(true)
      }
    }

    // When the tab comes back to the foreground and we've settled on REST, give the socket another chance.
    const onVisible = () => {
      if (stopped || socket !== null || document.visibilityState !== "visible") return
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
  } else if (wsLive === null) {
    status = "connecting"
  } else {
    status = wsLive ? "operational" : "down"
    live = wsLive
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
