"use client"

import { features, site } from "@packages/config/site"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { apiClient, unwrap } from "@/lib/api/client"

const formSchema = z.object({
  // empty and malformed are separate failures, so each names its own problem
  email: z
    .string()
    .trim()
    .min(1, { error: "Enter your email address to join." })
    .pipe(
      z.email({ error: "That does not look like an email address. Check for a typo." }).max(254),
    ),
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
        <div className="motion-safe:animate-in motion-safe:fade-in flex items-center gap-3 duration-500">
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

  // holds the address that was accepted, so the confirmation can echo it back
  const [joined, setJoined] = useState<string | null>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // the form unmounts on success, so focus would otherwise fall to <body>
  useEffect(() => {
    if (joined && successRef.current) successRef.current.focus()
  }, [joined])

  const joinWaitlist = useMutation({
    mutationFn: async (value: { email: string; subject: string }) => {
      const { error } = await unwrap(apiClient.waitlist.$post({ json: value }))
      if (error) throw new Error(error.message)
      return value.email
    },
    onSuccess: (email) => {
      setJoined(email)
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
    onSubmitInvalid: () => {
      if (emailRef.current) emailRef.current.focus()
    },
    onSubmit: ({ value }) => {
      // the API owns storage normalization (its schema trims and the insert lowercases); trimming here only keeps the echoed confirmation clean
      joinWaitlist.mutate({ ...value, email: value.email.trim() })
    },
  })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">{site.tagline}</p>

        {joined ? (
          // matches the single-row form height so submitting never shifts the layout (sm+); on mobile the form stacks
          <div
            ref={successRef}
            role="status"
            tabIndex={-1}
            className="flex min-h-12 w-full flex-col items-center justify-center gap-1 outline-none"
          >
            <p className="text-success text-lg">
              {"You're on the list. We'll be in touch at "}
              <span className="font-medium">{joined}</span>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-1">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setJoined(null)
                  form.reset()
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Not your email? Change it
              </Button>
              <span className="text-muted-foreground text-sm">or</span>
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                render={<a href={site.social.github} target="_blank" rel="noopener noreferrer" />}
              >
                browse the source
              </Button>
            </div>
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
                      ref={emailRef}
                      id={field.name}
                      type="email"
                      name={field.name}
                      autoComplete="email"
                      inputMode="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                      placeholder="you@example.com"
                      className="h-12 px-4 text-center text-base sm:text-left"
                      disabled={joinWaitlist.isPending}
                    />
                    {isInvalid && (
                      <FieldError
                        id={`${field.name}-error`}
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
              {joinWaitlist.isPending && <Spinner />}
              Join the waitlist
            </Button>
          </form>
        )}

        <WaitlistCount />
      </div>
    </main>
  )
}
