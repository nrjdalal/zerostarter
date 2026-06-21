"use client"

import { site } from "@packages/config/site"
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

  // fixed-height slot so the count appearing never shifts the layout
  return (
    <div className="mt-8 flex h-7 items-center justify-center">
      {typeof count === "number" && (
        <div className="animate-in fade-in flex items-center gap-3 duration-500">
          <AvatarGroup>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-2 text-xs text-white">A</AvatarFallback>
            </Avatar>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-3 text-xs text-white">B</AvatarFallback>
            </Avatar>
            <Avatar className="size-7">
              <AvatarFallback className="bg-chart-4 text-xs text-white">C</AvatarFallback>
            </Avatar>
          </AvatarGroup>
          <span className="text-muted-foreground text-sm">{count}+ people on the waitlist</span>
        </div>
      )}
    </div>
  )
}

export default function WaitlistPage() {
  const [email, setEmail] = useState("")
  // honeypot: humans never see it, bots fill it ("subject" dodges browser autofill)
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
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message ?? "Something went wrong. Please try again.")
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
    <main className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">{site.tagline}</p>

        {status === "joined" ? (
          // same height/width as the form row below, so submitting never shifts the layout
          <div className="text-muted-foreground flex h-12 w-full items-center justify-center gap-2 text-base">
            <RiCheckLine className="size-5 text-green-500" />
            {"You're on the list. We'll be in touch soon."}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
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
              {status === "loading" ? (
                <RiLoaderLine className="animate-spin" />
              ) : (
                "Join the waitlist"
              )}
            </Button>
          </form>
        )}

        <WaitlistCount />
      </div>
    </main>
  )
}
