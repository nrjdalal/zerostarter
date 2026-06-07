"use client"

import { RiCheckLine, RiLoaderLine } from "@remixicon/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"

function WaitlistCount() {
  // the API returns a display-ready count (floored and rounded server-side)
  const { data: count } = useQuery({
    queryKey: ["waitlist-count"],
    queryFn: async () => {
      const res = await apiClient.waitlist.$get()
      if (!res.ok) return null
      const { data } = await res.json()
      return data.count
    },
  })

  return (
    <div className="mt-8 flex h-7 items-center justify-center">
      {typeof count === "number" && (
        <div className="animate-in fade-in flex items-center gap-3 duration-500">
          <AvatarGroup>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-2 text-xs text-white">DD</AvatarFallback>
            </Avatar>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-3 text-xs text-white">AM</AvatarFallback>
            </Avatar>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-4 text-xs text-white">ND</AvatarFallback>
            </Avatar>
          </AvatarGroup>
          <span className="text-muted-foreground text-sm">{count}+ people on the waitlist</span>
        </div>
      )}
    </div>
  )
}

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "joined">("idle")
  const queryClient = useQueryClient()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status !== "idle") return
    setStatus("loading")
    try {
      const res = await apiClient.waitlist.$post({ json: { email, subject } })
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } }
        throw new Error(body.error?.message ?? "Something went wrong")
      }
      setStatus("joined")
      toast.success("You're on the waitlist!")
      queryClient.invalidateQueries({ queryKey: ["waitlist-count"] })
    } catch (err) {
      setStatus("idle")
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div>
      {status === "joined" ? (
        <div className="text-muted-foreground mx-auto flex h-12 items-center justify-center gap-2 text-base">
          <RiCheckLine className="size-5 text-green-500" />
          You&apos;re on the list. We&apos;ll be in touch soon.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-xl items-center gap-2">
          {/* honeypot: off-screen, bots fill it and get silently ignored */}
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="absolute -left-[9999px] h-px w-px opacity-0"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="h-12 flex-1 px-4 text-base"
            disabled={status === "loading"}
          />
          <Button
            type="submit"
            size="lg"
            className="h-12 px-6 text-base"
            disabled={status === "loading"}
          >
            {status === "loading" ? <RiLoaderLine className="animate-spin" /> : "Join the waitlist"}
          </Button>
        </form>
      )}
      <WaitlistCount />
    </div>
  )
}
