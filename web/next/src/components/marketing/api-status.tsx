"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"
import { cn } from "@/lib/utils"

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
  // The WebSocket is the live channel (pulsing dot). If it cannot connect or
  // deliver a frame (serverless deploy, a proxy that buffers the upgrade), fall
  // back to polling REST /api/health so the badge still reflects real status.
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
    let stopped = false
    let fellBack = false

    const fallBack = () => {
      if (stopped || fellBack) return
      fellBack = true
      if (deadline) clearTimeout(deadline)
      if (socket) socket.close()
      socket = null
      setUseRest(true)
    }

    socket = apiClient.health.ws.$ws()
    socket.addEventListener("message", (event) => {
      if (stopped || fellBack) return
      if (deadline) {
        clearTimeout(deadline)
        deadline = null
      }
      setWsLive(isOperational(event.data))
    })
    socket.addEventListener("close", fallBack)
    socket.addEventListener("error", fallBack)
    // A socket can open yet never deliver a frame; don't hang in "connecting" forever.
    deadline = setTimeout(fallBack, 4000)

    return () => {
      stopped = true
      if (deadline) clearTimeout(deadline)
      if (socket) socket.close()
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
