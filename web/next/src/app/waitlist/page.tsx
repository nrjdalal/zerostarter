"use client"

import { site } from "@packages/config/site"
import { RiCheckLine, RiLoaderLine } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }).max(254),
  // honeypot: unconstrained so it never blocks submission; the server silently drops bots
  subject: z.string(),
})

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
    <div className="mt-10 flex h-7 items-center justify-center">
      {typeof count === "number" && count > 0 && (
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
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm({
    // `subject` is a honeypot: humans never see it, bots fill it (dodges browser autofill)
    defaultValues: { email: "", subject: "" },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      setLoading(true)
      try {
        const res = await apiClient.waitlist.$post({
          json: { email: value.email, subject: value.subject },
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string }
          } | null
          toast.error(body?.error?.message ?? "Something went wrong. Please try again.")
          return
        }
        setJoined(true)
        toast.success("You're on the waitlist!")
        queryClient.invalidateQueries({ queryKey: ["waitlist-count"] })
      } finally {
        setLoading(false)
      }
    },
  })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">{site.tagline}</p>

        {joined ? (
          // same height/width as the form row, so submitting never shifts the layout
          <div className="text-muted-foreground flex h-12 w-full items-center justify-center gap-2 text-base">
            <RiCheckLine className="size-5 text-green-500" />
            {"You're on the list. We'll be in touch soon."}
          </div>
        ) : (
          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <form.Field name="subject">
              {(field) => (
                <input
                  type="text"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="absolute -left-[9999px] h-px w-px opacity-0"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  // relative so the error can be absolutely positioned and never grow the row
                  <Field data-invalid={isInvalid} className="relative flex-1">
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Email
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="email"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="you@example.com"
                      className="h-12 px-4 text-base"
                      disabled={loading}
                    />
                    {isInvalid && (
                      <FieldError
                        className="absolute top-full left-0 mt-1 text-left"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                )
              }}
            </form.Field>
            <Button type="submit" size="lg" className="h-12 px-6 text-base" disabled={loading}>
              {loading ? <RiLoaderLine className="animate-spin" /> : "Join the waitlist"}
            </Button>
          </form>
        )}

        <WaitlistCount />
      </div>
    </main>
  )
}
