"use client"

import { features, site } from "@packages/config/site"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { apiClient, unwrap } from "@/lib/api/client"

const formSchema = z.object({
  email: z.email({ error: "Please enter a valid email address." }).max(254),
  // honeypot: unconstrained so it never blocks submission; the server silently drops bots
  subject: z.string(),
})

function WaitlistCount() {
  // the API returns a display-ready count (floored and rounded server-side)
  const { data } = useQuery({
    queryKey: ["waitlist-count"],
    queryFn: async () => {
      const { data, error } = await unwrap(apiClient.waitlist.$get())
      // swallowing the error is deliberate: the count is non-critical chrome, so a failure just hides it
      if (error) return null
      return data
    },
  })

  // fixed-height slot so the count appearing never shifts the layout
  return (
    <div className="mt-10 flex h-7 items-center justify-center">
      {data && data.count > 0 && (
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
          <span className="text-muted-foreground text-sm">
            {data.count}+ people on the waitlist
          </span>
        </div>
      )}
    </div>
  )
}

export default function WaitlistPage() {
  if (!features.waitlist) notFound()

  const [joined, setJoined] = useState(false)
  const queryClient = useQueryClient()

  const joinWaitlist = useMutation({
    mutationFn: async (value: { email: string; subject: string }) => {
      const { error } = await unwrap(apiClient.waitlist.$post({ json: value }))
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setJoined(true)
      queryClient.invalidateQueries({ queryKey: ["waitlist-count"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const form = useForm({
    // `subject` is a honeypot: humans never see it, bots fill it (dodges browser autofill)
    defaultValues: { email: "", subject: "" },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: ({ value }) => {
      joinWaitlist.mutate(value)
    },
  })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">{site.tagline}</p>

        {joined ? (
          // matches the single-row form height so submitting never shifts the layout (sm+); on mobile the form stacks
          <div className="text-success flex min-h-12 w-full items-center justify-center text-lg">
            {"You're on the list. We'll be in touch soon."}
          </div>
        ) : (
          <form
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
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
                  // relative anchors the absolute (sm+) error; on mobile it stays in-flow so it never overlaps the stacked button
                  <Field data-invalid={isInvalid} className="relative w-full sm:flex-1">
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
                      className="h-12 px-4 text-center text-base sm:text-left"
                      disabled={joinWaitlist.isPending}
                    />
                    {isInvalid && (
                      <FieldError
                        className="mt-1 text-center sm:absolute sm:top-full sm:left-0 sm:text-left"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                )
              }}
            </form.Field>
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full px-6 text-base sm:w-auto"
              disabled={joinWaitlist.isPending}
            >
              {joinWaitlist.isPending ? <Spinner /> : "Join the waitlist"}
            </Button>
          </form>
        )}

        <WaitlistCount />
      </div>
    </main>
  )
}
