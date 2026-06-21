"use client"

import { site } from "@packages/config/site"
import { RiCheckLine, RiLoaderLine } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
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

  return (
    <div className="mt-6 h-6">
      {typeof count === "number" && (
        <p className="text-muted-foreground animate-in fade-in text-sm duration-500">
          {count}+ people on the waitlist
        </p>
      )}
    </div>
  )
}

export default function WaitlistPage() {
  // honeypot lives outside the typed form: humans never see it, bots fill it
  const [subject, setSubject] = useState("")
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      setLoading(true)
      try {
        const res = await apiClient.waitlist.$post({ json: { email: value.email, subject } })
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
        form.reset()
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
          <div className="text-muted-foreground flex h-11 items-center justify-center gap-2 text-base">
            <RiCheckLine className="size-5 text-green-500" />
            {"You're on the list. We'll be in touch soon."}
          </div>
        ) : (
          <form
            className="flex w-full items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
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
            <form.Field name="email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid} className="flex-1 text-left">
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
                      disabled={loading}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
            <Button type="submit" disabled={loading}>
              {loading ? <RiLoaderLine className="size-5 animate-spin" /> : "Join the waitlist"}
            </Button>
          </form>
        )}

        <WaitlistCount />
      </div>
    </main>
  )
}
