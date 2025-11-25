"use client"

import { useState } from "react"

import { RiGithubFill, RiGoogleFill } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import { signIn } from "@/lib/auth/client"
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

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
})

export default function Component() {
  const [loader, setLoader] = useState<"email" | "github" | "google" | null>(null)

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      setLoader("email")
      const res = await signIn.magicLink({
        email: value.email,
        callbackURL: "/x",
      })
      if (res.error) {
        toast.error(res.error.message)
        setLoader(null)
      } else {
        toast.success("Check your email for the magic link!")
        setLoader(null)
      }
      form.reset()
    },
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-24 cursor-pointer" size="sm" variant="outline">
          Login
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md sm:max-w-md"
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle className="text-center">Sign in/up</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">ACME Inc.</span>
            </div>
            <h1 className="text-xl font-semibold">Welcome to ACME Inc.</h1>
          </div>
          <form
            id="email"
            className="space-y-4"
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
                        id={field.name}
                        type="email"
                        name={field.name}
                        className="focus:placeholder:opacity-0"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="admin@nrjdalal.com"
                        disabled={loader === "email"}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
            </FieldGroup>
            <Button
              form="email"
              type="submit"
              variant="secondary"
              className="w-full cursor-pointer"
              disabled={loader === "email"}
            >
              {loader === "email" ? <Loader2 className="size-5 animate-spin" /> : null}
              Sign in/up
            </Button>
          </form>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2 text-xs">
              OR
            </span>
          </div>
          <div className="grid gap-4">
            <Button
              variant="outline"
              type="button"
              className="w-full cursor-pointer"
              onClick={async () => {
                setLoader("github")
                const res = await signIn.social({
                  provider: "github",
                  callbackURL: "/x",
                })
                if (res.error) {
                  toast.error(res.error.message)
                  setLoader(null)
                }
              }}
              disabled={loader === "github"}
            >
              {loader === "github" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <RiGithubFill className="size-5" />
              )}
              Continue with Github
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full cursor-pointer"
              onClick={async () => {
                setLoader("google")
                const res = await signIn.social({
                  provider: "google",
                  callbackURL: "/x",
                })
                if (res.error) {
                  toast.error(res.error.message)
                  setLoader(null)
                }
              }}
              disabled={loader === "google"}
            >
              {loader === "google" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <RiGoogleFill className="size-5" />
              )}
              Continue with Google
            </Button>
            <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
              By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
              <a href="#">Privacy Policy</a>.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
