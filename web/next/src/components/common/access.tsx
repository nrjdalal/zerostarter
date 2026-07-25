"use client"

import { site } from "@packages/config/site"
import { RiGithubFill, RiGoogleFill, RiLayoutGridFill } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { apiClient, unwrap } from "@/lib/api/client"
import { authClient } from "@/lib/auth/client"
import { config } from "@/lib/config"

const formSchema = z.object({
  // string() is here for trim(): z.email() alone rejects a padded address before any trim runs. One error function covers both failures, so no separate min() is needed.
  email: z
    .string()
    .trim()
    .pipe(
      z.email({
        error: (issue) =>
          String(issue.input ?? "").trim() === ""
            ? "Enter your email address to continue."
            : "That does not look like an email address. Check for a typo.",
      }),
    ),
})

export function Access({ labelClassName }: { labelClassName?: string }) {
  const pathname = usePathname()
  const [loader, setLoader] = useState<"email" | "github" | "google" | null>(null)
  const [open, setOpen] = useState(false)
  // focus lands on the heading, not the first field: entering the dialog keeps the focus trap and the screen-reader announcement, while autofocusing the email input would pop the keyboard on mobile
  const headingRef = useRef<HTMLHeadingElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  // Next inlines NODE_ENV at build time: "development" only under `next dev`,
  // "production" for any `next build`. Auto-hides in deployments.
  const isDev = process.env.NODE_ENV === "development"

  // Render only the sign-in providers the API reports as enabled (GET /api/auth/providers); deploy-static so cached for the session and prefetched on mount, so the dialog (whose content mounts on open) paints the final state with no flash.
  const { data, isError, isPending } = useQuery({
    queryKey: ["auth-providers"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await unwrap(apiClient.auth.providers.$get())
      if (error) throw new Error(error.message)
      return data
    },
  })
  // The extra isDev keeps this dev-only admin control out of any production bundle.
  const agentEnabled = isDev && (data?.providers.includes("agent") ?? false)
  const githubEnabled = data?.providers.includes("github") ?? false
  const googleEnabled = data?.providers.includes("google") ?? false
  const magicLinkEnabled = data?.providers.includes("magic-link") ?? false
  const hasAlternatives = agentEnabled || githubEnabled || googleEnabled
  const hasNoProviders = !magicLinkEnabled && !hasAlternatives

  useEffect(() => {
    setLoader(null)
    setOpen(false)
  }, [pathname])

  const form = useForm({
    defaultValues: {
      email: "",
    },
    // one validator source on purpose: TanStack keeps an error per source, so adding onSubmit/onBlur leaves a stale entry from the previous value and FieldError lists both
    validators: { onChange: formSchema },
    onSubmitInvalid: () => {
      if (emailRef.current) emailRef.current.focus()
    },
    onSubmit: async ({ value }) => {
      setLoader("email")
      const res = await authClient.signIn.magicLink({
        email: value.email,
        callbackURL: `${config.app.url}/dashboard`,
      })
      if (res.error) {
        toast.error(res.error.message || "Provider Not Found")
        setLoader(null)
      } else {
        toast.success("Check your email for the magic link!")
        setLoader(null)
      }
      form.reset()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-24" variant="outline" />}>
        <span className={labelClassName}>Login</span>
      </DialogTrigger>
      <DialogContent className="max-w-md" initialFocus={headingRef}>
        <DialogHeader className="sr-only">
          <DialogTitle className="text-center">Sign in/up</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <RiLayoutGridFill className="size-6" />
              </div>
              <span className="sr-only">{site.name}</span>
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
              Welcome to {site.name}
            </h2>
          </div>
          {magicLinkEnabled && (
            <form
              id="email"
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field name="email">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          ref={emailRef}
                          id={field.name}
                          type="email"
                          name={field.name}
                          autoComplete="email"
                          inputMode="email"
                          aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                          className="focus:placeholder:opacity-0"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="you@example.com"
                          disabled={loader === "email"}
                        />
                        {isInvalid && (
                          <FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
              <Button
                form="email"
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={loader === "email"}
              >
                {loader === "email" ? <Spinner /> : null}
                Sign in/up
              </Button>
            </form>
          )}
          {magicLinkEnabled && hasAlternatives && (
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-popover text-muted-foreground relative z-10 px-2 text-xs">
                OR
              </span>
            </div>
          )}
          {hasAlternatives && (
            <div className="grid gap-4">
              {agentEnabled && (
                <form action={`${config.api.url}/api/agents/sign-in-as`} method="POST">
                  <Button type="submit" variant="outline" className="w-full">
                    Login (agents)
                  </Button>
                </form>
              )}
              {githubEnabled && (
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={async () => {
                    setLoader("github")
                    const res = await authClient.signIn.social({
                      provider: "github",
                      callbackURL: `${config.app.url}/dashboard`,
                    })
                    if (res.error) {
                      toast.error(res.error.message)
                      setLoader(null)
                    }
                  }}
                  disabled={loader === "github"}
                >
                  {loader === "github" ? <Spinner /> : <RiGithubFill className="size-5" />}
                  Continue with GitHub
                </Button>
              )}
              {googleEnabled && (
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={async () => {
                    setLoader("google")
                    const res = await authClient.signIn.social({
                      provider: "google",
                      callbackURL: `${config.app.url}/dashboard`,
                    })
                    if (res.error) {
                      toast.error(res.error.message)
                      setLoader(null)
                    }
                  }}
                  disabled={loader === "google"}
                >
                  {loader === "google" ? <Spinner /> : <RiGoogleFill className="size-5" />}
                  Continue with Google
                </Button>
              )}
            </div>
          )}
          {(magicLinkEnabled || hasAlternatives) &&
            site.legal &&
            site.legal.terms &&
            site.legal.privacy && (
              <div className="text-muted-foreground text-center text-xs text-balance">
                By clicking continue, you agree to our{" "}
                <a
                  href={site.legal.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline underline-offset-4"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href={site.legal.privacy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline underline-offset-4"
                >
                  Privacy Policy
                </a>
                .
              </div>
            )}
          {hasNoProviders &&
            (isPending ? (
              <div className="text-muted-foreground flex justify-center">
                <Spinner className="size-5" />
              </div>
            ) : isError ? (
              <p className="text-muted-foreground text-center text-sm">
                Could not load sign-in options. Refresh to try again.
              </p>
            ) : (
              <p className="text-muted-foreground text-center text-sm">
                No sign-in options are configured yet.
                {isDev && " Set AGENT_SIGNIN_ENABLED=true in .env to enable local agent login."}
              </p>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
